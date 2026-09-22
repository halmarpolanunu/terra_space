import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {pipelineStats} from './pipeline-data';

const Metric: React.FC<{value: string; label: string; delay: number}> = ({value, label, delay}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const opacity = interpolate(frame, [delay, delay + fps * 0.38], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return <div style={{opacity}}><div style={{color: '#f2a93b', fontSize: 64, fontWeight: 700, letterSpacing: -2}}>{value}</div><div style={{color: '#b5becb', fontSize: 17, letterSpacing: 1.2, marginTop: 8}}>{label}</div></div>;
};

export const SummaryScene: React.FC = () => (
  <AbsoluteFill style={{padding: '106px 126px', justifyContent: 'center'}}>
    <div style={{color: '#f6f1e7', fontSize: 42, fontWeight: 700}}>Verified pipeline, current state.</div>
    <div style={{display: 'flex', gap: 56, alignItems: 'end', marginTop: 56}}>
      <Metric value={`${pipelineStats.cleanedArticles} → ${pipelineStats.mainIssues} → ${pipelineStats.phase3Results}`} label="ARTICLES → ISSUES → PHASE 3 RESULTS" delay={0} />
      <Metric value={String(pipelineStats.eventCandidates)} label="EVENT CANDIDATES" delay={9} />
      <Metric value={`${pipelineStats.valid} / ${pipelineStats.needsReview}`} label="PHASE 3 RESULTS: VALID / NEEDS REVIEW" delay={18} />
    </div>
    <div style={{height: 1, background: 'rgba(246, 241, 231, 0.18)', marginTop: 62}} />
    <div style={{color: '#b5becb', fontSize: 19, marginTop: 24}}>Next, but not yet: actors · countries · relationships · taxonomy · final Events</div>
  </AbsoluteFill>
);
