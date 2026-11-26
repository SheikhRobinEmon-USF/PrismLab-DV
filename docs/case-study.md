# PrismLab case study

PrismLab explores how a local data tool can keep a reader close to the evidence. A visualization can communicate a pattern quickly, but readers often need to know which rows contributed, how missing data was handled, and whether the underlying source has changed since an annotation was written.

The analysis view uses one typed query for the plotted values, table and headline measure. A selected mark narrows the evidence inspector and the linked contributing-row chart. The chart data table provides the same selection path by keyboard. When a chart goes into the storyboard, the card keeps the data digest, query, aggregate value, numerator when applicable, contributing denominator, and limitations.

The retail walkthrough starts with 96 synthetic transactions aggregated into twelve monthly groups. The total is $1,568,472. Filtering to South leaves 24 rows totaling $363,972. The published query definition can reproduce these values from the source bytes. The example is fictional, and the comparison describes a difference in filtered totals without assigning causes.

The earthquake example demonstrates Parquet import and geographic marks from real USGS observations. A point represents records grouped by exact coordinate pair. Coverage is restricted to the catalog query's date window and magnitude threshold. The sample cannot show geographic or historical differences in overall earthquake incidence.

[Architecture](architecture.md) · [Performance measurements](performance.md)
