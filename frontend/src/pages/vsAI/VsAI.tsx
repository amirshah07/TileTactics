import { NoMoreTilesToastProvider } from '../../components/NoMoreTilesToast/NoMoreTilesToastContext';
import VsAIContent from './vsAIContent.tsx';

const VsAI = () => {
  return (
    <NoMoreTilesToastProvider>
      <VsAIContent />
    </NoMoreTilesToastProvider>
  );
};

export default VsAI;