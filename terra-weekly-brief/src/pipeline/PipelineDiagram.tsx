import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {phases, pipelineStats, type PhaseNumber} from './pipeline-data';

type PipelineDiagramProps = {
  activePhase: PhaseNumber | 'all';
  showCounts: boolean;
};

const colors = {
  amber: '#f2a93b',
  ink: '#07090d',
  paper: '#f6f1e7',
  muted: '#9ca3af',
  line: 'rgba(246, 241, 231, 0.18)',
  panel: 'rgba(246, 241, 231, 0.055)',
  green: '#7ed7a1',
  blue: '#8db7ff',
};

const Arrow: React.FC<{visible: number; y: number}> = ({visible, y}) => (
  <svg
    aria-hidden="true"
    style={{position: 'absolute', left: 0, top: y, width: '100%', height: 40, opacity: visible}}
    viewBox="0 0 1600 40"
  >
    <path d="M1120 20H1510" fill="none" stroke={colors.line} strokeWidth="2" />
    <path d="M1510 20l-12-8m12 8l-12 8" fill="none" stroke={colors.amber} strokeWidth="2" />
  </svg>
);

export const PipelineDiagram: React.FC<PipelineDiagramProps> = ({activePhase, showCounts}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill style={{padding: '28px 44px', justifyContent: 'center'}}>
      {phases.map((phase, index) => {
        const isActive = activePhase === 'all' || activePhase === phase.number;
        const progress = spring({
          frame: Math.max(0, frame - index * 5),
          fps,
          config: {damping: 200, stiffness: 160},
        });
        const opacity = isActive ? interpolate(progress, [0, 1], [0, 1]) : 0.27;
        const count = phase.number === 1 ? pipelineStats.cleanedArticles : phase.number === 2 ? pipelineStats.mainIssues : pipelineStats.eventCandidates;

        return (
          <div
            key={phase.number}
            style={{
              height: 136,
              display: 'grid',
              gridTemplateColumns: '150px 255px 1fr 270px',
              gap: 22,
              alignItems: 'center',
              opacity,
              translate: `${interpolate(progress, [0, 1], [-26, 0])}px 0px`,
              borderTop: index === 0 ? `1px solid ${colors.line}` : 'none',
              borderBottom: `1px solid ${colors.line}`,
            }}
          >
            <div>
              <div style={{fontSize: 16, letterSpacing: 3, color: isActive ? colors.amber : colors.muted, fontWeight: 700}}>{phase.eyebrow}</div>
              <div style={{marginTop: 8, fontSize: 23, color: colors.paper, fontWeight: 600, lineHeight: 1.08}}>{phase.title}</div>
            </div>
            <div style={{fontSize: 20, color: colors.paper, lineHeight: 1.2}}>{phase.input}</div>
            <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
              <div style={{padding: '15px 20px', border: `1px solid ${isActive ? 'rgba(242, 169, 59, 0.6)' : colors.line}`, background: colors.panel, color: colors.paper, borderRadius: 8, fontSize: 19, fontWeight: 600, whiteSpace: 'nowrap'}}>
                {phase.process}
              </div>
              <div style={{width: 34, height: 1, background: colors.line}} />
              <div style={{display: 'flex', gap: 7, flexWrap: 'wrap', maxWidth: 220}}>
                {phase.checks.map((check) => (
                  <span key={check} style={{color: colors.muted, fontSize: 15, letterSpacing: 0.6, border: `1px solid ${colors.line}`, padding: '7px 10px', borderRadius: 999}}>{check}</span>
                ))}
              </div>
            </div>
            <div style={{justifySelf: 'end', width: 250, padding: '16px 19px', background: isActive ? 'rgba(242, 169, 59, 0.12)' : colors.panel, border: `1px solid ${isActive ? colors.amber : colors.line}`, borderRadius: 10}}>
              <div style={{fontSize: 19, color: colors.paper, fontWeight: 700}}>{phase.output}</div>
              {showCounts ? <div style={{fontSize: 15, color: colors.amber, marginTop: 7, letterSpacing: 0.8}}>{count} {phase.number === 3 ? 'RETAINED' : 'COMPLETE'}</div> : null}
            </div>
          </div>
        );
      })}
      <Arrow visible={activePhase === 'all' ? 1 : 0} y={272} />
    </AbsoluteFill>
  );
};
