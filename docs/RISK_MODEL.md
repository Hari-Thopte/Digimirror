# Explainable risk model

Version: `digimirror-risk-v2`.

Each normalized field has a published sensitivity baseline. Visibility, recipient breadth, and whether a relevant permission is enabled adjust the finding score. Category scores are then personalized by the selected threat profile and combined using category weights.

```text
finding score = sensitivity × visibility multiplier × recipient/permission adjustments
overall score = weighted personalized category scores, clamped to 0–100
```

Profiles are `everyday`, `public_figure`, `frequent_traveler`, `financially_sensitive`, and `family`. A profile changes stated category multipliers; it does not silently change evidence.

Every result returns:

- per-finding scores, confidence, evidence sources, origin, action, recipient, and limitations;
- category scores and weights;
- the factors contributing to the overall score;
- a model version and a machine-readable model-description endpoint at `/api/v1/risk/model`.

Scores are decision support, not breach confirmation or a probability of harm. User feedback is recorded as transparent accuracy feedback, never as hidden retraining data. Changes should be calibrated against versioned fixtures before updating the model version.
