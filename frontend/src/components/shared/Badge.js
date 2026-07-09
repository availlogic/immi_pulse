import { classNames } from '../../lib/utils';
import './shared.css';

export default function Badge({ children, type = 'default', className }) {
  return (
    <span className={classNames('badge', `badge-${type}`, className)}>
      {children}
    </span>
  );
}
