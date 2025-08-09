package com.paytracker.nativeapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContent {
      MaterialTheme {
        Surface(Modifier.fillMaxSize()) {
          PaymentsScreen()
        }
      }
    }
  }
}

@Composable
fun PaymentsScreen() {
  Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
    Text("PayTracker Native", style = MaterialTheme.typography.headlineSmall)
    ElevatedButton(onClick = { /* TODO: add payment */ }, modifier = Modifier.align(Alignment.Start)) {
      Text("Add Payment")
    }
    ElevatedCard {
      Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Payments", style = MaterialTheme.typography.titleMedium)
        Text("This is a native scaffold. TODO: implement offline storage and list.")
      }
    }
  }
}