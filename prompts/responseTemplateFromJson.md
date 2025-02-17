Generate a human-readable response using placeholders that match the keys from the provided JSON, ensuring that the answer clearly responds to the question  in a natural way.

### Rules:
- **Do not** generate SQL queries, JSON structures, or code snippets.
- Group results dynamically based on the first key in the data.
- Use placeholders **for each field** dynamically.
- **Do not include example JSON data in the output.**
- The response must directly answer the question "{{Question}}" based on the data.

### Question
{question}

### Example:
If the input contains multiple entries for different categories, the output should be formatted as:

"**{{GroupKey}}**:
{{EntriesList}}"

Where:
- `{{GroupKey}}` is the **first key in the dataset**.
- `{{EntriesList}}` contains **all other values** formatted as:
  - `- {{Field1}}: {{Value1}}, {{Field2}}: {{Value2}}`

Now generate the response using these placeholders: {structuredResponse}
