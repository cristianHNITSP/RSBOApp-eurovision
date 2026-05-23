import './FormSection.css';

const FIELD_TYPES = {
  text:     'text',
  number:   'number',
  email:    'email',
  tel:      'tel',
  textarea: 'textarea',
  select:   'select',
};

const FormField = ({ field, value, onChange }) => {
  const { id, label, type = 'text', placeholder = '', required, size = 'md', options = [] } = field;

  const inputClass = 'form-field__input';

  return (
    <div className={`form-field form-field--${size}`}>
      <label className="form-field__label" htmlFor={id}>
        {label}
        {required && <span className="form-field__required" aria-hidden="true">*</span>}
      </label>

      {type === 'textarea' ? (
        <textarea
          id={id}
          className={`${inputClass} form-field__textarea`}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={e => onChange?.(id, e.target.value)}
          rows={3}
        />
      ) : type === 'select' ? (
        <select
          id={id}
          className={inputClass}
          value={value ?? ''}
          onChange={e => onChange?.(id, e.target.value)}
        >
          <option value="" disabled>{placeholder || 'Seleccionar...'}</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={FIELD_TYPES[type] ?? 'text'}
          className={inputClass}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={e => onChange?.(id, e.target.value)}
        />
      )}
    </div>
  );
};

const FormSection = ({ sections = [], values = {}, onChange }) => (
  <div className="form-section">
    {sections.map((section, i) => (
      <div key={i} className="form-section__group">
        {section.title && (
          <h3 className="form-section__title">{section.title}</h3>
        )}
        <div className="form-section__fields">
          {section.fields.map(field => (
            <FormField
              key={field.id}
              field={field}
              value={values[field.id]}
              onChange={onChange}
            />
          ))}
        </div>
      </div>
    ))}
  </div>
);

export default FormSection;
