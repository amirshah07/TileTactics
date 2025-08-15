import { NoMoreTilesToastProvider } from '../../components/NoMoreTilesToast/NoMoreTilesToastContext.tsx';
import VsAIContent from './VsAIContent';

const VsAI = () => {
  return (
    <NoMoreTilesToastProvider>
      <VsAIContent />
    </NoMoreTilesToastProvider>
  );
};

export default VsAI;