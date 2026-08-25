export const REPORT_STATUSES = ['RECEIVED', 'PENDING', 'PROCESSED', 'REVIEWING', 'PUBLISHED'];

export const KANBAN_COLUMNS = [
  { status: 'RECEIVED',  action: 'SCRUMING',      note: 'Reviewing business ideas & problem statements' },
  { status: 'PENDING',   action: 'REQUIREMENT',   note: 'Gathering customer data & B2B/B2C specs' },
  { status: 'PROCESSED', action: 'MAPPING',       note: 'Defining TAM/SAM/SOM conversions' },
  { status: 'REVIEWING', action: 'ADMIN_REVIEW',  note: 'Admin reviewing report with Orbita AI' },
  { status: 'PUBLISHED', action: 'DELIVERED',     note: 'Generated scores & downloadable artifacts' },
];
