function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : ((random & 0x3) | 0x8);
    return value.toString(16);
  });
}

return $input.all().map((item) => ({
  json: {
    ...item.json,
    p3_submission_key: uuidv4(),
    p3_model_name: 'google/gemma-4-12b-qat',
    p3_detection_prompt_version: 'phase3-event-candidate-detection-v4-single-paragraph-evidence',
    p3_safeguard_prompt_version: 'phase3-event-candidate-safeguard-v4-literal-detail-check',
  },
}));
