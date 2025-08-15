import { NoMoreTilesToastProvider } from '../../components/NoMoreTilesToast/NoMoreTilesToastContext';
import WordFinderContent from './WordFinderContent';

const WordFinder = () => {
  return (
    <NoMoreTilesToastProvider>
      <WordFinderContent />
    </NoMoreTilesToastProvider>
  );
};

export default WordFinder;