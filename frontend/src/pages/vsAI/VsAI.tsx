import { NoMoreTilesToastProvider } from '../../components/NoMoreTilesToast/NoMoreTilesToastContext';
import VsAIContent from './vsAIContent';

const VsAI = () => {
  return (
    <NoMoreTilesToastProvider>
      <VsAIContent />
    </NoMoreTilesToastProvider>
  );
};

export default VsAI;