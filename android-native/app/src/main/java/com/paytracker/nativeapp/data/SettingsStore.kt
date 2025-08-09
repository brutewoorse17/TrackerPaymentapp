package com.paytracker.nativeapp.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import java.io.IOException

private val Context.dataStore by preferencesDataStore(name = "settings")

class SettingsStore(private val context: Context) {
  private val DARK_MODE = booleanPreferencesKey("dark_mode")

  val isDarkMode: Flow<Boolean> = context.dataStore.data
    .catch { e -> if (e is IOException) emit(emptyPreferences()) else throw e }
    .map { prefs -> prefs[DARK_MODE] ?: false }

  suspend fun setDarkMode(enabled: Boolean) {
    context.dataStore.edit { prefs -> prefs[DARK_MODE] = enabled }
  }
}