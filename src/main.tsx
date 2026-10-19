import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/os.css';
import { Desktop } from './os/Desktop';
createRoot(document.getElementById('root')!).render(<Desktop />);
