import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const composition = readFileSync(new URL('../src/Composition.tsx', import.meta.url), 'utf8');
const pipelineVideo = readFileSync(new URL('../src/pipeline/PipelineVideo.tsx', import.meta.url), 'utf8');

test('pipeline remains a 15-second composition at 30 fps', () => {
  assert.match(composition, /id="TerraSpacePhasePipeline"/);
  assert.match(composition, /durationInFrames=\{15 \* fps\}/);
});

test('pipeline uses one continuous living flow instead of slide sequences', () => {
  assert.match(pipelineVideo, /LivingDataFlow/);
  assert.doesNotMatch(pipelineVideo, /<Sequence/);
});
