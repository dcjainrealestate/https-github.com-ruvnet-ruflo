import { applyFieldVisibility, maskValue } from '../src/services/maskingService';

describe('maskValue', () => {
  it('fully masks short values', () => {
    expect(maskValue('99')).toBe('**');
  });

  it('keeps the first/last two characters of longer values', () => {
    expect(maskValue('9876543210')).toBe('98******10');
  });
});

describe('applyFieldVisibility', () => {
  const record = {
    id: 'inv_1',
    mobileNo: '9876543210',
    emailId: 'buyer@example.com',
    customerName: 'Jane Doe',
    submittedById: 'user_1',
  };

  it('never masks or hides fields for SUPER_ADMIN', () => {
    const result = applyFieldVisibility(record, 'SUPER_ADMIN', [
      { fieldKey: 'mobileNo', role: 'SUPER_ADMIN', mode: 'HIDDEN' },
    ]);
    expect(result.mobileNo).toBe('9876543210');
  });

  it('never masks or hides fields for the record owner', () => {
    const result = applyFieldVisibility(
      record,
      'SALES_MEMBER',
      [{ fieldKey: 'mobileNo', role: 'SALES_MEMBER', mode: 'HIDDEN' }],
      { isOwner: true },
    );
    expect(result.mobileNo).toBe('9876543210');
  });

  it('masks a field when a MASKED rule applies to the viewer role', () => {
    const result = applyFieldVisibility(record, 'SALES_MEMBER', [
      { fieldKey: 'mobileNo', role: 'SALES_MEMBER', mode: 'MASKED' },
    ]);
    expect(result.mobileNo).toBe('98******10');
  });

  it('removes a field entirely when a HIDDEN rule applies to the viewer role', () => {
    const result = applyFieldVisibility(record, 'SALES_MEMBER', [
      { fieldKey: 'emailId', role: 'SALES_MEMBER', mode: 'HIDDEN' },
    ]);
    expect(result.emailId).toBeUndefined();
    expect('emailId' in result).toBe(false);
  });

  it('leaves fields untouched when no rule targets the viewer role', () => {
    const result = applyFieldVisibility(record, 'CONTRIBUTOR', [
      { fieldKey: 'mobileNo', role: 'ADMIN', mode: 'HIDDEN' },
    ]);
    expect(result.mobileNo).toBe('9876543210');
  });
});
