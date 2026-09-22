import {AbsoluteFill} from 'remotion';
import {LivingDataFlow} from './LivingDataFlow';

export const PipelineVideo: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#05070a', overflow: 'hidden'}}>
    <LivingDataFlow />
  </AbsoluteFill>
);
