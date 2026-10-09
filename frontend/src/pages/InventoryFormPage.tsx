import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createInventory, getInventory, updateInventory, type InventoryInput } from '../api/inventory';
import { ApiError } from '../api/client';
import { useDynamicFieldOptions } from '../hooks/useDynamicFieldOptions';
import type { OptionBackedFieldKey } from '../types';

const FIELD_LABELS: Record<OptionBackedFieldKey, string> = {
  propertyCategory: 'Property Category',
  propertySubCategory: 'Property Sub Category',
  developerName: 'Developer Name',
  projectName: 'Project Name',
  sector: 'Sector',
  microMarket: 'Micro Market',
  accommodation: 'Accommodation',
  facing: 'Facing',
  furnishingStatus: 'Furnishing Status',
};

const EMPTY_FORM: InventoryInput = {
  propertyCategory: '',
  propertySubCategory: '',
  developerName: '',
  projectName: '',
  sector: '',
  microMarket: '',
  customerType: 'SELLER',
  customerName: '',
  mobileNo: '',
  alternateMobileNo: '',
  emailId: '',
  alternateEmailId: '',
  towerNameNo: '',
  flatNo: '',
  floor: '',
  accommodation: '',
  area: 0,
  facing: '',
  furnishingStatus: '',
  askingPrice: undefined,
  expectedRent: undefined,
  propertyAgeYears: 0,
  holdingDurationYears: 0,
  targetSaleTimeframeDays: 90,
};

export function InventoryFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { loading: optionsLoading, optionsFor, onParentValueChange, primeFromRecord } = useDynamicFieldOptions();

  const [form, setForm] = useState<InventoryInput>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(isEdit);

  useEffect(() => {
    if (!isEdit || !id || optionsLoading) return;
    getInventory(id)
      .then(async (record) => {
        setForm(record);
        await primeFromRecord(record as unknown as Record<string, unknown>);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load listing.'))
      .finally(() => setLoadingRecord(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit, optionsLoading]);

  function updateField<K extends keyof InventoryInput>(key: K, value: InventoryInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleOptionFieldChange(key: OptionBackedFieldKey, value: string) {
    updateField(key, value);
    await onParentValueChange(key, value);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload: InventoryInput = {
        ...form,
        alternateMobileNo: form.alternateMobileNo || undefined,
        emailId: form.emailId || undefined,
        alternateEmailId: form.alternateEmailId || undefined,
        askingPrice: form.customerType === 'SELLER' ? Number(form.askingPrice) : undefined,
        expectedRent: form.customerType === 'LESSOR' ? Number(form.expectedRent) : undefined,
      };
      if (isEdit && id) {
        await updateInventory(id, payload);
      } else {
        await createInventory(payload);
      }
      navigate('/inventory');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this listing.');
    } finally {
      setSubmitting(false);
    }
  }

  if (optionsLoading || loadingRecord) {
    return (
      <div className="container">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>{isEdit ? 'Edit Listing' : 'New Resale Listing'}</h1>
      {error && <div className="alert alert-error">{error}</div>}

      <form className="inventory-form" onSubmit={handleSubmit}>
        <fieldset>
          <legend>Property</legend>
          <div className="form-grid">
            {(['propertyCategory', 'propertySubCategory', 'developerName', 'projectName', 'sector', 'microMarket'] as const).map(
              (key) => (
                <label key={key}>
                  {FIELD_LABELS[key]}
                  <select value={form[key] as string} onChange={(e) => handleOptionFieldChange(key, e.target.value)} required>
                    <option value="">Select…</option>
                    {optionsFor(key).map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              ),
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend>Customer</legend>
          <div className="form-grid">
            <label>
              Customer Type
              <select value={form.customerType} onChange={(e) => updateField('customerType', e.target.value as 'SELLER' | 'LESSOR')}>
                <option value="SELLER">Seller</option>
                <option value="LESSOR">Lessor</option>
              </select>
            </label>
            <label>
              Customer Name
              <input value={form.customerName} onChange={(e) => updateField('customerName', e.target.value)} required />
            </label>
            <label>
              Mobile No.
              <input value={form.mobileNo} onChange={(e) => updateField('mobileNo', e.target.value)} required />
            </label>
            <label>
              Alternate Mobile No.
              <input
                value={form.alternateMobileNo ?? ''}
                onChange={(e) => updateField('alternateMobileNo', e.target.value)}
              />
            </label>
            <label>
              Email ID
              <input type="email" value={form.emailId ?? ''} onChange={(e) => updateField('emailId', e.target.value)} />
            </label>
            <label>
              Alternate Email ID
              <input
                type="email"
                value={form.alternateEmailId ?? ''}
                onChange={(e) => updateField('alternateEmailId', e.target.value)}
              />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Unit</legend>
          <div className="form-grid">
            <label>
              Tower Name/No.
              <input value={form.towerNameNo} onChange={(e) => updateField('towerNameNo', e.target.value)} required />
            </label>
            <label>
              Flat No.
              <input value={form.flatNo} onChange={(e) => updateField('flatNo', e.target.value)} required />
            </label>
            <label>
              Floor
              <input value={form.floor} onChange={(e) => updateField('floor', e.target.value)} required />
            </label>
            <label>
              Accommodation
              <select value={form.accommodation} onChange={(e) => updateField('accommodation', e.target.value)} required>
                <option value="">Select…</option>
                {optionsFor('accommodation').map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Area (sq.ft.)
              <input
                type="number"
                min={1}
                value={form.area}
                onChange={(e) => updateField('area', Number(e.target.value))}
                required
              />
            </label>
            <label>
              Facing
              <select value={form.facing} onChange={(e) => updateField('facing', e.target.value)} required>
                <option value="">Select…</option>
                {optionsFor('facing').map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Furnishing Status
              <select
                value={form.furnishingStatus}
                onChange={(e) => updateField('furnishingStatus', e.target.value)}
                required
              >
                <option value="">Select…</option>
                {optionsFor('furnishingStatus').map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Commercials</legend>
          <div className="form-grid">
            {form.customerType === 'SELLER' ? (
              <label>
                Asking Price (₹)
                <input
                  type="number"
                  min={1}
                  value={form.askingPrice ?? ''}
                  onChange={(e) => updateField('askingPrice', Number(e.target.value))}
                  required
                />
              </label>
            ) : (
              <label>
                Expected Rent (₹/month)
                <input
                  type="number"
                  min={1}
                  value={form.expectedRent ?? ''}
                  onChange={(e) => updateField('expectedRent', Number(e.target.value))}
                  required
                />
              </label>
            )}
            <label>
              Property Age (years)
              <input
                type="number"
                min={0}
                step="0.5"
                value={form.propertyAgeYears}
                onChange={(e) => updateField('propertyAgeYears', Number(e.target.value))}
                required
              />
            </label>
            <label>
              Holding Duration (years)
              <input
                type="number"
                min={0}
                step="0.5"
                value={form.holdingDurationYears}
                onChange={(e) => updateField('holdingDurationYears', Number(e.target.value))}
                required
              />
            </label>
            <label>
              Target Sale/Lease Timeframe (days)
              <input
                type="number"
                min={1}
                value={form.targetSaleTimeframeDays}
                onChange={(e) => updateField('targetSaleTimeframeDays', Number(e.target.value))}
                required
              />
              <span className="hint">You'll get reminder emails until this listing is marked sold.</span>
            </label>
          </div>
        </fieldset>

        <div className="form-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Listing'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/inventory')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
