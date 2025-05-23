import { NoMoreTilesToastProvider } from '../../components/NoMoreTilesToast/NoMoreTilesToastContext';
import BoardAnalysisContent from './BoardAnalysisContent';

const BoardAnalysis = () => {
  return (
    <NoMoreTilesToastProvider>
      <BoardAnalysisContent />
    </NoMoreTilesToastProvider>
  );
};

export default BoardAnalysis;