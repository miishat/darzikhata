import { Navigate } from 'react-router';
import { useCan } from '../common/hooks';
import { SETTINGS_SECTIONS } from './sections';

/** Sends people to the first settings section they may use. */
export function SettingsHome() {
  const can = useCan();
  const first = SETTINGS_SECTIONS.find((s) => s.requires.some(can));
  return first ? <Navigate to={first.path} replace /> : null;
}
