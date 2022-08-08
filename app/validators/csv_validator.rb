class CsvValidator < ActiveModel::Validator
  def validate(record)
    if not_csv?(record)
      record.errors.add(
        :file,
        I18n.t(
          'activemodel.errors.models.autocomplete_items.invalid_type'
        )
      )
    elsif record.file_values.empty?
      record.errors.add(
        :file,
        I18n.t(
          'activemodel.errors.models.autocomplete_items.empty'
        )
      )
    elsif invalid_headings?(record) || record.file_values.map(&:size).max > 2
      record.errors.add(
        :file,
        I18n.t(
          'activemodel.errors.models.autocomplete_items.incorrect_format'
        )
      )
    end
  end

  private

  def not_csv?(record)
    ['text/csv', 'application/csv'].exclude?(record.file.content_type)
  end

  def invalid_headings?(record)
    (record.file_headings.count == 1 && record.file_headings != %w[text]) ||
      (record.file_headings.count == 2 && record.file_headings != %w[text value])
  end
end