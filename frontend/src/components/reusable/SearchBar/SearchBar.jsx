import { IconSearch } from '../../icons/Icons.jsx';
import './SearchBar.css';

const SearchBar = ({ placeholder = 'Buscar...', value, onChange, className = '' }) => (
  <div className={['search-bar', className].join(' ')}>
    <span className="search-bar__icon">
      <IconSearch width={18} height={18} />
    </span>
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="search-bar__input"
    />
  </div>
);

export default SearchBar;
