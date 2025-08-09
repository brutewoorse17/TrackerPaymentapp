package com.paytracker.nativeapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.paytracker.nativeapp.data.Repository
import com.paytracker.nativeapp.data.PaymentWithClient
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContent {
      val repo = remember { Repository.create(this) }
      val scope = rememberCoroutineScope()
      var items by remember { mutableStateOf<List<PaymentWithClient>>(emptyList()) }
      var loading by remember { mutableStateOf(true) }

      LaunchedEffect(Unit) {
        scope.launch {
          repo.ensureSeed()
          items = repo.listPaymentsWithClient()
          loading = false
        }
      }

      MaterialTheme {
        Surface(Modifier.fillMaxSize()) {
          PaymentsScreen(items, loading)
        }
      }
    }
  }
}

@Composable
fun PaymentsScreen(items: List<PaymentWithClient>, loading: Boolean) {
  Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
    Text("PayTracker Native", style = MaterialTheme.typography.headlineSmall)
    ElevatedButton(onClick = { /* TODO: add payment */ }, modifier = Modifier.align(Alignment.Start)) {
      Text("Add Payment")
    }
    ElevatedCard(Modifier.fillMaxSize()) {
      if (loading) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
          CircularProgressIndicator()
        }
      } else {
        LazyColumn(Modifier.fillMaxSize().padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
          items(items) { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
              Column(Modifier.weight(1f)) {
                Text(row.clientName, style = MaterialTheme.typography.bodyLarge)
                Text(row.payment.description ?: row.payment.invoiceNumber, style = MaterialTheme.typography.bodySmall)
              }
              Text("₱" + String.format("%.2f", row.payment.amount), style = MaterialTheme.typography.bodyMedium)
            }
            Divider(Modifier.padding(vertical = 8.dp))
          }
        }
      }
    }
  }
}