const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function getPreferences(userId) {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('item_key, item_value')
    .eq('user_id', userId);

  if (error) throw error;
  return Object.fromEntries((data || []).map((r) => [r.item_key, r.item_value]));
}

async function setPreference(userId, key, value) {
  const { error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: userId, item_key: key.trim(), item_value: value.trim() }, { onConflict: 'user_id,item_key' });

  if (error) throw error;
}

async function deletePreference(userId, key) {
  const { error } = await supabase
    .from('user_preferences')
    .delete()
    .eq('user_id', userId)
    .eq('item_key', key.trim());

  if (error) throw error;
}

async function listPreferences(userId) {
  return getPreferences(userId);
}

module.exports = { getPreferences, setPreference, deletePreference, listPreferences };
