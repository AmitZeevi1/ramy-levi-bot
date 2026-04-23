const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();

const SYSTEM_PROMPT = `אתה עוזר לניתוח רשימות קניות בסופרמרקט רמי לוי.
קיבלת רשימת פריטים. עבור כל פריט, החלט:
1. האם הפריט ברור מספיק לחיפוש? (למשל "חלב תנובה 3%" - ברור)
2. האם הפריט עמום ודורש הבהרה? (למשל "אבוקדו" - כמה קילו?, "פסטה" - איזה סוג?)

פריטים עמומים נפוצים:
- פירות/ירקות הנמכרים לפי משקל: אבוקדו, עגבניות, בננות, תפוחים וכו' → שאל על כמות בק"ג
- קטגוריות כלליות: פסטה, גבינה, לחם → שאל על סוג ספציפי
- מוצרים עם גרסאות רבות: חלב (אחוז שומן?), יוגורט (טעם?) - רק אם לא צוין

החזר JSON בפורמט הבא בלבד (ללא טקסט נוסף):
{
  "clarified": [
    { "original": "שם מקורי", "query": "שאילתת חיפוש משופרת", "needsClarification": false },
    { "original": "שם עמום", "query": null, "needsClarification": true, "question": "שאלת הבהרה קצרה בעברית" }
  ]
}`;

async function analyzeShoppingList(items) {
  const itemsList = items.map((item) => `- ${item.name}${item.quantity > 1 ? ` (כמות: ${item.quantity})` : ''}`).join('\n');

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `רשימת קניות:\n${itemsList}` }],
  });

  const text = response.content[0].text.trim();
  const json = JSON.parse(text);
  return json.clarified;
}

const MERGE_PROMPT = `אתה עוזר לניתוח רשימות קניות. קיבלת פריטים עמומים, שאלות ההבהרה ששאלת, ותשובות המשתמש.
מצא את השאילתת חיפוש המתאימה עבור כל פריט לפי התשובות.
החזר JSON בפורמט הבא בלבד:
{
  "resolved": [
    { "original": "שם מקורי", "query": "שאילתת חיפוש סופית" }
  ]
}`;

async function mergeClarifications(pendingItems, answers) {
  const context = pendingItems
    .map((item, i) => `פריט: ${item.original}\nשאלה: ${item.question}\nתשובה: ${answers[i] || ''}`)
    .join('\n\n');

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: MERGE_PROMPT,
    messages: [{ role: 'user', content: context }],
  });

  const text = response.content[0].text.trim();
  const json = JSON.parse(text);
  return json.resolved;
}

module.exports = { analyzeShoppingList, mergeClarifications };
