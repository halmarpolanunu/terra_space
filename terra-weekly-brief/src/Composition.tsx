import {Composition, Sequence} from 'remotion';
import {ClosingScene} from './scenes/ClosingScene';
import {ClimateScene} from './scenes/ClimateScene';
import {OpeningScene} from './scenes/OpeningScene';
import {SecurityScene} from './scenes/SecurityScene';
import {StraitScene} from './scenes/StraitScene';
import {UkraineScene} from './scenes/UkraineScene';
import {PipelineVideo} from './pipeline/PipelineVideo';

const fps = 30;

export const MyComposition: React.FC = () => {
  return (
    <>
      <Composition id="TerraWeeklyBrief" component={TerraWeeklyBrief} durationInFrames={54 * fps} fps={fps} width={1080} height={1920} />
      <Composition id="TerraSpacePhasePipeline" component={PipelineVideo} durationInFrames={15 * fps} fps={fps} width={1920} height={1080} />
    </>
  );
};

export const TerraWeeklyBrief: React.FC = () => (
  <>
    <Sequence durationInFrames={8 * fps} name="Opening"><OpeningScene /></Sequence>
    <Sequence from={8 * fps} durationInFrames={9 * fps} name="Strait of Hormuz"><StraitScene /></Sequence>
    <Sequence from={17 * fps} durationInFrames={9 * fps} name="Ukraine"><UkraineScene /></Sequence>
    <Sequence from={26 * fps} durationInFrames={9 * fps} name="Security"><SecurityScene /></Sequence>
    <Sequence from={35 * fps} durationInFrames={9 * fps} name="Climate and energy"><ClimateScene /></Sequence>
    <Sequence from={44 * fps} durationInFrames={10 * fps} name="Closing"><ClosingScene /></Sequence>
  </>
);
