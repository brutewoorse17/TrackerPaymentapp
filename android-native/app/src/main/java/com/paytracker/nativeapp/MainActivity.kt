package com.paytracker.nativeapp

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import com.paytracker.nativeapp.data.Repository
import com.paytracker.nativeapp.data.PaymentWithClient
import com.paytracker.nativeapp.data.PaymentEntity
import kotlinx.coroutines.launch
import java.io.BufferedReader
import java.io.InputStreamReader

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContent {
      val repo = remember { Repository.create(this) }
      val scope = rememberCoroutineScope()
      var items by remember { mutableStateOf<List<PaymentWithClient>>(emptyList()) }
      var loading by remember { mutableStateOf(true) }
      var query by remember { mutableStateOf(TextFieldValue("")) }
      var status by remember { mutableStateOf("all") }
      var showDialog by remember { mutableStateOf(false) }
      var editTarget by remember { mutableStateOf<PaymentWithClient?>(null) }

      val refresh: suspend () -> Unit = {
        repo.ensureSeed()
        items = repo.listPaymentsWithClient()
        loading = false
      }

      LaunchedEffect(Unit) { scope.launch { refresh() } }

      MaterialTheme {
        Surface(Modifier.fillMaxSize()) {
          PaymentsScreen(
            items = items,
            loading = loading,
            query = query,
            onQueryChange = { query = it },
            status = status,
            onStatusChange = { status = it },
            onAdd = { showDialog = true; editTarget = null },
            onEdit = { target -> showDialog = true; editTarget = target },
            onBackup = {
              scope.launch {
                val json = repo.exportJson()
                val createLauncher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) {}
              }
            },
            onRestore = { uri ->
              scope.launch {
                val json = contentResolver.openInputStream(uri)?.use { input ->
                  BufferedReader(InputStreamReader(input)).readText()
                } ?: return@launch
                repo.importJson(json)
                refresh()
              }
            }
          )
          if (showDialog) {
            PaymentDialog(
              initial = editTarget,
              onDismiss = { showDialog = false },
              onSave = { inv, amt, due, desc, stat ->
                scope.launch {
                  val base = editTarget?.payment
                  val p = PaymentEntity(
                    id = base?.id ?: java.util.UUID.randomUUID().toString(),
                    clientId = base?.clientId ?: items.firstOrNull()?.payment?.clientId ?: return@launch,
                    invoiceNumber = inv,
                    amount = amt,
                    dueDate = due,
                    paidDate = if (stat == "paid") System.currentTimeMillis() else null,
                    status = stat,
                    description = desc
                  )
                  repo.upsertPayment(p)
                  showDialog = false
                  refresh()
                }
              }
            )
          }
        }
      }
    }
  }
}

@Composable
fun StatusBadge(status: String) {
  val color = when (status) {
    "paid" -> Color(0xFF16a34a)
    "overdue" -> Color(0xFFdc2626)
    else -> Color(0xFFf59e0b)
  }
  AssistChip(onClick = {}, label = { Text(status.replaceFirstChar { it.uppercase() }) }, colors = AssistChipDefaults.assistChipColors(labelColor = color))
}

@Composable
fun PaymentsScreen(
  items: List<PaymentWithClient>,
  loading: Boolean,
  query: TextFieldValue,
  onQueryChange: (TextFieldValue) -> Unit,
  status: String,
  onStatusChange: (String) -> Unit,
  onAdd: () -> Unit,
  onEdit: (PaymentWithClient) -> Unit,
  onBackup: () -> Unit,
  onRestore: (Uri) -> Unit,
) {
  val activity = LocalContext.current as Activity
  val createDoc = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
    if (uri != null) {
      // Write will be handled by onBackup using activity.contentResolver if needed later
    }
  }
  val openDoc = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
    uri?.let(onRestore)
  }

  Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
    Text("PayTracker Native", style = MaterialTheme.typography.headlineSmall)
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
      OutlinedTextField(value = query, onValueChange = onQueryChange, modifier = Modifier.weight(1f), label = { Text("Search") })
      ExposedDropdownMenuBox(expanded = false, onExpandedChange = {}) {
        OutlinedTextField(value = status, onValueChange = {}, readOnly = true, label = { Text("Status") })
      }
      ElevatedButton(onClick = onAdd) { Text("Add") }
      OutlinedButton(onClick = { openDoc.launch(arrayOf("application/json")) }) { Text("Restore") }
    }
    ElevatedCard(Modifier.fillMaxSize()) {
      if (loading) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
      } else {
        val filtered = items.filter { row ->
          (query.text.isBlank() || row.clientName.contains(query.text, ignoreCase = true) || (row.payment.description?.contains(query.text, true) ?: false)) &&
          (status == "all" || row.payment.status == status)
        }
        LazyColumn(Modifier.fillMaxSize().padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
          items(filtered) { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
              Column(Modifier.weight(1f)) {
                Text(row.clientName, style = MaterialTheme.typography.bodyLarge)
                Text(row.payment.description ?: row.payment.invoiceNumber, style = MaterialTheme.typography.bodySmall)
              }
              Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                StatusBadge(row.payment.status)
                Text("₱" + String.format("%.2f", row.payment.amount), style = MaterialTheme.typography.bodyMedium)
                TextButton(onClick = { onEdit(row) }) { Text("Edit") }
              }
            }
            Divider(Modifier.padding(vertical = 8.dp))
          }
        }
      }
    }
  }
}

@Composable
fun PaymentDialog(
  initial: PaymentWithClient?,
  onDismiss: () -> Unit,
  onSave: (invoice: String, amount: Double, dueDateMs: Long, description: String?, status: String) -> Unit,
) {
  var invoice by remember { mutableStateOf(initial?.payment?.invoiceNumber ?: "") }
  var amount by remember { mutableStateOf(initial?.payment?.amount?.toString() ?: "") }
  var description by remember { mutableStateOf(initial?.payment?.description ?: "") }
  var status by remember { mutableStateOf(initial?.payment?.status ?: "pending") }
  val now = System.currentTimeMillis()
  var dueDate by remember { mutableStateOf(initial?.payment?.dueDate ?: now) }

  AlertDialog(
    onDismissRequest = onDismiss,
    title = { Text(if (initial == null) "Add Payment" else "Edit Payment") },
    text = {
      Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedTextField(value = invoice, onValueChange = { invoice = it }, label = { Text("Invoice") })
        OutlinedTextField(value = amount, onValueChange = { amount = it }, label = { Text("Amount") })
        OutlinedTextField(value = description, onValueChange = { description = it }, label = { Text("Description") })
        OutlinedTextField(value = status, onValueChange = { status = it }, label = { Text("Status") })
      }
    },
    confirmButton = {
      TextButton(onClick = {
        onSave(invoice, amount.toDoubleOrNull() ?: 0.0, dueDate, description.ifBlank { null }, status)
      }) { Text("Save") }
    },
    dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
  )
}