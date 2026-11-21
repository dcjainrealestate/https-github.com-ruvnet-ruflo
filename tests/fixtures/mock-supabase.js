// Shared mock for window.supabase, injected via page.addInitScript() before
// the app's own inline script runs. Mimics just enough of the supabase-js
// client surface for DB.fetchAll()/addTask()/etc. to work against seed data
// held entirely in the browser, so tests don't need a real Supabase project.
//
// Pass `seed` to override the default employees/departments/projects. Every
// call also stubs window.fetch for the email-relay endpoint
// (/functions/v1/trigger-broadcast) and records calls to it on
// window.__fetchCalls, so tests can assert on outbound "emails" without a
// real Supabase Edge Function or network access.

const DEFAULT_EMPLOYEES = [
  { id: 1, name: 'Admin User', role: 'admin', department: 'Operations', title: 'Admin', join_date: '2024-01-01', active: true, token: 'ADMN-0001', email: 'admin@example.test', super_admin: true },
  { id: 2, name: 'Test Member', role: 'member', department: 'Operations', title: 'Associate', join_date: '2024-01-01', active: true, token: 'MEMB-0002', email: 'member@example.test', super_admin: false },
  { id: 3, name: 'No Email Member', role: 'member', department: 'Operations', title: 'Associate', join_date: '2024-01-01', active: true, token: 'MEMB-0003', email: '', super_admin: false },
];
const DEFAULT_DEPARTMENTS = [{ id: 1, name: 'Operations' }];
const DEFAULT_PROJECTS = [{ id: 1, name: 'Internal', mascot: null }];

function buildInitScript(seed = {}) {
  const employees = seed.employees || DEFAULT_EMPLOYEES;
  const departments = seed.departments || DEFAULT_DEPARTMENTS;
  const projects = seed.projects || DEFAULT_PROJECTS;
  // Pass e.g. { user: { email: 'member@example.test', id: 'auth-uid-123' } }
  // to simulate an already-established Supabase Auth session (as if a
  // magic-link redirect had just landed), or omit for a logged-out boot.
  const session = seed.session || null;
  // Canned response for the handwriting-OCR endpoint (an array of line
  // strings, as the real self-hosted service returns), or a function of
  // (url, opts) => response body, for tests that need to vary it. Defaults
  // to a realistic 3-line list.
  const ocrLines = seed.ocrLines || ['Buy milk', 'Call John Smith', 'Finish quarterly report'];

  return `
    window.__fetchCalls = [];
    window.__rpcCalls = [];
    window.__nextDbTaskId = 1;
    const __origFetch = window.fetch.bind(window);
    window.fetch = function(url, opts){
      if (typeof url === 'string' && url.indexOf('/functions/v1/trigger-broadcast') !== -1) {
        window.__fetchCalls.push({ url, opts, body: opts && opts.body ? JSON.parse(opts.body) : null });
        return Promise.resolve({ ok: true, status: 200 });
      }
      if (typeof url === 'string' && url.indexOf('/scan') !== -1) {
        window.__fetchCalls.push({ url, opts });
        return Promise.resolve({ ok: true, status: 200, json: function(){ return Promise.resolve({ lines: ${JSON.stringify(ocrLines)} }); } });
      }
      return __origFetch(url, opts);
    };

    function __chain(data){
      const c = {
        _data: data, _insertedRow: null,
        select(){ return this; }, order(){ return this; }, limit(){ return this; },
        eq(){ return this; }, match(){ return this; }, in(){ return this; },
        gte(){ return this; }, lte(){ return this; }, or(){ return this; },
        delete(){ return this; },
        insert(row){
          const r = Array.isArray(row) ? Object.assign({}, row[0]) : Object.assign({}, row);
          if (r.id == null) r.id = window.__nextDbTaskId++;
          this._insertedRow = r;
          return this;
        },
        update(row){ this._insertedRow = row; return this; },
        upsert(row){ this._insertedRow = Array.isArray(row) ? row[0] : row; return this; },
        single(){ return Promise.resolve({ data: this._insertedRow || (Array.isArray(this._data) ? this._data[0] : this._data), error: null }); },
        then(resolve, reject){ return Promise.resolve({ data: this._data, error: null }).then(resolve, reject); }
      };
      return c;
    }

    window.supabase = {
      createClient: function(){
        return {
          auth: { getSession: async function(){ return { data: { session: ${JSON.stringify(session)} } }; } },
          channel: function(){ const ch = { on: function(){ return ch; }, subscribe: function(){ return ch; } }; return ch; },
          removeChannel: function(){},
          rpc: function(fn, args){
            window.__rpcCalls.push({ fn, args });
            return Promise.resolve({ data: null, error: null });
          },
          from: function(table){
            if (table === 'employees') return __chain(${JSON.stringify(employees)});
            if (table === 'departments') return __chain(${JSON.stringify(departments)});
            if (table === 'projects') return __chain(${JSON.stringify(projects)});
            if (table === 'tasks') return __chain([]);
            if (table === 'task_comments') return __chain([]);
            return __chain([]);
          }
        };
      }
    };
  `;
}

module.exports = { buildInitScript, DEFAULT_EMPLOYEES, DEFAULT_DEPARTMENTS, DEFAULT_PROJECTS };
