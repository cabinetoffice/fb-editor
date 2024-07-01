ALLOWED_DOMAINS = [
  'cabinetoffice.gov.uk',
  'digital.cabinet-office.gov.uk',
  'yaml.farm'
].freeze

Rails.application.config.allowed_domains = ALLOWED_DOMAINS
