/** Every label a document can carry. The AI must choose from this list, and so must checklists. */
export const documentTypes: Record<string, string> = {
  claim_form: 'Claim form',
  police_report: 'Police report',
  drivers_licence: "Driver's licence",
  vehicle_registration: 'Vehicle registration',
  repair_quote: 'Repair quote',
  assessor_report: "Assessor's report",
  invoice: 'Invoice',
  receipt: 'Receipt',
  id_document: 'ID document',
  policy_schedule: 'Policy schedule',
  proof_of_ownership: 'Proof of ownership',
  damage_photo: 'Photo of damage',
  death_certificate: 'Death certificate',
  burial_permit: 'Burial permit',
  affidavit: 'Affidavit',
  medical_report: 'Medical report',
  other: 'Other',
};

const item = (type: string, required = true) => ({ type, required });

/** Starting checklists. Each insurer edits these to match its own rules. */
export const startingChecklists: Record<string, { type: string; required: boolean }[]> = {
  'Motor comprehensive': [
    item('claim_form'), item('drivers_licence'), item('vehicle_registration'), item('police_report'),
    item('repair_quote'), item('assessor_report', false), item('damage_photo', false),
  ],
  'Motor third party': [
    item('claim_form'), item('drivers_licence'), item('vehicle_registration'), item('police_report'), item('repair_quote', false),
  ],
  'Funeral and life': [
    item('claim_form'), item('death_certificate'), item('id_document'), item('burial_permit', false), item('affidavit', false),
  ],
  Medical: [item('claim_form'), item('id_document'), item('medical_report'), item('invoice')],
  Property: [
    item('claim_form'), item('proof_of_ownership'), item('repair_quote'), item('police_report', false), item('damage_photo', false),
  ],
  Agriculture: [item('claim_form'), item('proof_of_ownership'), item('assessor_report'), item('damage_photo', false)],
};
