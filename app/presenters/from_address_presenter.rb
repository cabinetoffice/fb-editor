class FromAddressPresenter
  def initialize(from_address)
    @from_address = from_address
    @messages = {
      verified: I18n.t('settings.from_address.messages.verified'),
      pending: I18n.t('settings.from_address.messages.pending_html'), 
      default: I18n.t('settings.from_address.messages.default'), 
    }
  end

  def message
    {
      text: messages[from_address.status.to_sym],
      status: from_address.status 
    }
  end

  private

  attr_reader :from_address, :messages
end
