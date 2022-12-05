class Settings::ReferencePaymentController < FormController
  before_action :assign_form_objects

  def index; end

  def create
    @reference_payment = ReferencePaymentSettings.new(
      reference_payment_params.merge(service_id: service.service_id)
    )

    if @reference_payment.valid?
      ReferencePaymentUpdater.new(
        reference_payment_settings: @reference_payment,
        service: service
      ).create_or_update!

      redirect_to settings_reference_payment_index_path(service_id: service.service_id)
    else
      render :index, status: :unprocessable_entity
    end
  end

  private

  def assign_form_objects
    @reference_payment = ReferencePaymentSettings.new(service_id: service.service_id)
    @confirmation_email_enabled = confirmation_email_setting('dev').try(:send_confirmation_email?) && confirmation_email_setting('production').try(:send_confirmation_email?)
  end

  def confirmation_email_setting(environment)
    SubmissionSetting.find_by(
      service_id: service.service_id,
      deployment_environment: environment
    )
  end

  def reference_payment_params
    params.require(:reference_payment_settings).permit(:reference_number, :payment_link, :payment_link_url)
  end
end
