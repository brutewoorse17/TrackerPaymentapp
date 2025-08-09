@file:OptIn(ExperimentalMaterial3Api::class)
package com.paytracker.nativeapp

import android.app.Activity
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.paytracker.nativeapp.data.Repository
import com.paytracker.nativeapp.data.PaymentWithClient
import com.paytracker.nativeapp.data.PaymentEntity
import kotlinx.coroutines.launch
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import kotlinx.coroutines.runBlocking

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Splash screen
    installSplashScreen()
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
      val settingsStore = remember { com.paytracker.nativeapp.data.SettingsStore(this) }
      var darkMode by rememberSaveable { mutableStateOf(false) }
      LaunchedEffect(Unit) {
        settingsStore.isDarkMode.collect { darkMode = it }
      }

      val refresh: suspend () -> Unit = {
        repo.ensureSeed()
        items = repo.listPaymentsWithClient()
        loading = false
      }
      LaunchedEffect(Unit) { scope.launch { refresh() } }

      val ctx = LocalContext.current
      val createDoc = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        if (uri != null) {
          scope.launch {
            val json = repo.exportJson()
            ctx.contentResolver.openOutputStream(uri)?.use { out ->
              OutputStreamWriter(out).use { it.write(json) }
            }
          }
        }
      }
      val openDoc = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
          scope.launch {
            val json = ctx.contentResolver.openInputStream(uri)?.use { input ->
              BufferedReader(InputStreamReader(input)).readText()
            } ?: return@launch
            repo.importJson(json)
            refresh()
          }
        }
      }

      com.paytracker.nativeapp.ui.theme.PayTrackerTheme(useDarkTheme = darkMode) {
        val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
        val scopeDrawer = rememberCoroutineScope()
        val addClientRequest = remember { mutableStateOf(false) }
        val navController = rememberNavController()
        val backStack by navController.currentBackStackEntryAsState()
        val currentRoute = backStack?.destination?.route ?: "payments"
        ModalNavigationDrawer(
          drawerState = drawerState,
          drawerContent = {
            ModalDrawerSheet {
              Text("PayTracker", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(16.dp))
              NavigationDrawerItem(
                label = { Text("Payments") },
                selected = currentRoute == "payments",
                onClick = {
                  scopeDrawer.launch { drawerState.close() }
                  if (currentRoute != "payments") navController.navigate("payments") { popUpTo(0) }
                }
              )
              NavigationDrawerItem(
                label = { Text("Clients") },
                selected = currentRoute == "clients",
                onClick = {
                  scopeDrawer.launch { drawerState.close() }
                  if (currentRoute != "clients") navController.navigate("clients") { popUpTo(0) }
                }
              )
              NavigationDrawerItem(
                label = { Text("Settings") },
                selected = currentRoute == "settings",
                onClick = {
                  scopeDrawer.launch { drawerState.close() }
                  if (currentRoute != "settings") navController.navigate("settings") { popUpTo(0) }
                }
              )
            }
          }
        ) {
          Scaffold(
            topBar = {
              TopAppBar(
                navigationIcon = {
                  IconButton(onClick = { scopeDrawer.launch { drawerState.open() } }) { Icon(Icons.Default.Menu, contentDescription = "Menu") }
                },
                title = { Text(when (currentRoute) { "settings" -> "Settings"; "clients" -> "Clients"; else -> "Payments" }) }
              )
            },
            floatingActionButton = {
              if (currentRoute == "payments") {
                FloatingActionButton(onClick = { showDialog = true; editTarget = null }) { Icon(Icons.Default.Add, contentDescription = "Add") }
              } else if (currentRoute == "clients") {
                FloatingActionButton(onClick = { addClientRequest.value = true }) { Icon(Icons.Default.Add, contentDescription = "Add Client") }
              }
            }
          ) { padding ->
            Surface(Modifier.fillMaxSize().padding(padding)) {
              NavHost(navController = navController, startDestination = "payments") {
                composable("payments") {
                  PaymentsScreen(
                    repo = repo,
                    items = items,
                    loading = loading,
                    query = query,
                    onQueryChange = { query = it },
                    status = status,
                    onStatusChange = { status = it },
                    onAdd = { showDialog = true; editTarget = null },
                    onEdit = { target -> showDialog = true; editTarget = target },
                    onBackup = { createDoc.launch("paytracker-backup.json") },
                    onRestore = { openDoc.launch(arrayOf("application/json")) }
                  )
                }
                composable("clients") {
                  ClientsScreen(
                    repo = repo,
                    onRefresh = { scope.launch { refresh() } },
                    externalShowAdd = addClientRequest
                  )
                }
                composable("settings") {
                  SettingsScreen(
                    isDark = darkMode,
                    onToggleDark = { v -> darkMode = v; scope.launch { settingsStore.setDarkMode(v) } },
                    onBackup = { createDoc.launch("paytracker-backup.json") },
                    onRestore = { openDoc.launch(arrayOf("application/json")) }
                  )
                }
              }

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
  }
}

@Composable
fun StatusBadge(status: String) {
  val color = when (status) {
    "paid" -> Color(0xFF16a34a)
    "overdue" -> Color(0xFFdc2626)
    else -> Color(0xFFf59e0b)
  }
  FilledTonalButton(onClick = {}, colors = ButtonDefaults.filledTonalButtonColors(contentColor = color)) {
    Text(status.replaceFirstChar { it.uppercase() })
  }
}

@Composable
fun PaymentsScreen(
  repo: Repository,
  items: List<PaymentWithClient>,
  loading: Boolean,
  query: TextFieldValue,
  onQueryChange: (TextFieldValue) -> Unit,
  status: String,
  onStatusChange: (String) -> Unit,
  onAdd: () -> Unit,
  onEdit: (PaymentWithClient) -> Unit,
  onBackup: () -> Unit,
  onRestore: () -> Unit,
) {
  Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
    Text("PayTracker Native", style = MaterialTheme.typography.headlineSmall)

    // Summary cards
    val totalPaid = items.filter { it.payment.status == "paid" }.sumOf { it.payment.amount }
    val outstanding = items.filter { it.payment.status != "paid" }.sumOf { it.payment.amount }
    val overdueCount = items.count { it.payment.status != "paid" && it.payment.dueDate < System.currentTimeMillis() }
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
      ElevatedCard(Modifier.weight(1f)) { Column(Modifier.padding(12.dp)) { Text("Total Paid", style = MaterialTheme.typography.labelMedium); Text("₱" + String.format("%.2f", totalPaid), style = MaterialTheme.typography.titleMedium) } }
      ElevatedCard(Modifier.weight(1f)) { Column(Modifier.padding(12.dp)) { Text("Outstanding", style = MaterialTheme.typography.labelMedium); Text("₱" + String.format("%.2f", outstanding), style = MaterialTheme.typography.titleMedium) } }
      ElevatedCard(Modifier.weight(1f)) { Column(Modifier.padding(12.dp)) { Text("Overdue", style = MaterialTheme.typography.labelMedium); Text(overdueCount.toString(), style = MaterialTheme.typography.titleMedium) } }
    }

    // Filters
    var clientFilter by remember { mutableStateOf("All") }
    var sortBy by remember { mutableStateOf("Newest") }
    var clients by remember { mutableStateOf<List<com.paytracker.nativeapp.data.ClientEntity>>(emptyList()) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) { scope.launch { clients = repo.listClients() } }

    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
      OutlinedTextField(value = query, onValueChange = onQueryChange, modifier = Modifier.weight(1f), label = { Text("Search") })
      var expanded by remember { mutableStateOf(false) }
      Box {
        OutlinedButton(onClick = { expanded = true }) { Text(status) }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
          listOf("all", "pending", "paid", "overdue").forEach { s ->
            DropdownMenuItem(text = { Text(s) }, onClick = { onStatusChange(s); expanded = false })
          }
        }
      }
      var expandedClient by remember { mutableStateOf(false) }
      Box {
        OutlinedButton(onClick = { expandedClient = true }) { Text(clientFilter) }
        DropdownMenu(expanded = expandedClient, onDismissRequest = { expandedClient = false }) {
          DropdownMenuItem(text = { Text("All") }, onClick = { clientFilter = "All"; expandedClient = false })
          clients.forEach { c -> DropdownMenuItem(text = { Text(c.name) }, onClick = { clientFilter = c.name; expandedClient = false }) }
        }
      }
      var expandedSort by remember { mutableStateOf(false) }
      Box {
        OutlinedButton(onClick = { expandedSort = true }) { Text(sortBy) }
        DropdownMenu(expanded = expandedSort, onDismissRequest = { expandedSort = false }) {
          listOf("Newest","Oldest","Amount High","Amount Low","Due Soonest").forEach { s -> DropdownMenuItem(text = { Text(s) }, onClick = { sortBy = s; expandedSort = false }) }
        }
      }
      ElevatedButton(onClick = onAdd) { Text("Add") }
      OutlinedButton(onClick = onBackup) { Text("Backup") }
      OutlinedButton(onClick = onRestore) { Text("Restore") }
      // Export CSV
      val ctx = LocalContext.current
      val createCsv = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/csv")) { uri ->
        if (uri != null) {
          val csv = runBlocking { repo.exportPaymentsCsv() }
          ctx.contentResolver.openOutputStream(uri)?.use { out -> out.write(csv.toByteArray()) }
        }
      }
      OutlinedButton(onClick = { createCsv.launch("payments.csv") }) { Text("CSV") }
      // Export PDF
      val createPdf = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/pdf")) { uri ->
        if (uri != null) {
          val pdf = android.graphics.pdf.PdfDocument()
          val pageInfo = android.graphics.pdf.PdfDocument.PageInfo.Builder(595, 842, 1).create()
          val page = pdf.startPage(pageInfo)
          val paint = android.graphics.Paint().apply { textSize = 12f }
          var y = 40
          page.canvas.drawText("Payments Report", 40f, y.toFloat(), paint); y += 20
          val header = "Invoice | Client | Amount | Due | Status"
          page.canvas.drawText(header, 40f, y.toFloat(), paint); y += 20
          items.take(35).forEach { r ->
            val line = "${r.payment.invoiceNumber} | ${r.clientName} | ₱${String.format("%.2f", r.payment.amount)} | ${java.text.SimpleDateFormat("yyyy-MM-dd").format(java.util.Date(r.payment.dueDate))} | ${r.payment.status}"
            page.canvas.drawText(line, 40f, y.toFloat(), paint); y += 18
          }
          pdf.finishPage(page)
          ctx.contentResolver.openOutputStream(uri)?.use { out -> pdf.writeTo(out) }
          pdf.close()
        }
      }
      OutlinedButton(onClick = { createPdf.launch("payments.pdf") }) { Text("PDF") }
    }
    ElevatedCard(Modifier.fillMaxSize()) {
      if (loading) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
      } else {
        val filtered = items.filter { row ->
          (query.text.isBlank() || row.clientName.contains(query.text, ignoreCase = true) || (row.payment.description?.contains(query.text, true) ?: false)) &&
          (status == "all" || row.payment.status == status) &&
          (clientFilter == "All" || row.clientName == clientFilter)
        }
        val sorted = when (sortBy) {
          "Oldest" -> filtered.sortedBy { it.payment.createdAt }
          "Amount High" -> filtered.sortedByDescending { it.payment.amount }
          "Amount Low" -> filtered.sortedBy { it.payment.amount }
          "Due Soonest" -> filtered.sortedBy { it.payment.dueDate }
          else -> filtered.sortedByDescending { it.payment.createdAt }
        }
        LazyColumn(Modifier.fillMaxSize().padding(12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
          items(sorted) { row ->
            ElevatedCard(Modifier.fillMaxWidth()) {
              Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                  Text(row.clientName, style = MaterialTheme.typography.titleMedium)
                  val dueMs = row.payment.dueDate
                  val daysLeft = ((dueMs - System.currentTimeMillis()) / 86_400_000L).toInt()
                  val sub = (row.payment.description ?: row.payment.invoiceNumber) + if (row.payment.status != "paid") {
                    when {
                      daysLeft < 0 -> " • Overdue by ${-daysLeft}d"
                      daysLeft <= 3 -> " • Due in ${daysLeft}d"
                      else -> ""
                    }
                  } else ""
                  Text(sub, style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                  StatusBadge(row.payment.status)
                  Text("₱" + String.format("%.2f", row.payment.amount), style = MaterialTheme.typography.bodyMedium)
                  TextButton(onClick = { onEdit(row) }) { Text("Edit") }
                  if (row.payment.status != "paid") {
                    TextButton(onClick = {
                      val p = row.payment.copy(status = "paid", paidDate = System.currentTimeMillis())
                      val scopeRow = rememberCoroutineScope()
                      scopeRow.launch { repo.upsertPayment(p) }
                    }) { Text("Mark Paid") }
                  }
                }
              }
            }
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
        var expanded by remember { mutableStateOf(false) }
        Box {
          OutlinedButton(onClick = { expanded = true }) { Text(status) }
          DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            listOf("pending", "paid", "overdue").forEach { s ->
              DropdownMenuItem(text = { Text(s) }, onClick = { status = s; expanded = false })
            }
          }
        }
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

@Composable
fun SettingsScreen(
  isDark: Boolean,
  onToggleDark: (Boolean) -> Unit,
  onBackup: () -> Unit,
  onRestore: () -> Unit,
) {
  Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
    Text("Settings", style = MaterialTheme.typography.titleLarge)
    ElevatedCard(Modifier.fillMaxWidth()) {
      Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
          Text("Dark Mode")
          Switch(checked = isDark, onCheckedChange = onToggleDark)
        }
      }
    }
    ElevatedCard(Modifier.fillMaxWidth()) {
      Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Backup & Restore", style = MaterialTheme.typography.titleMedium)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
          OutlinedButton(onClick = onBackup) { Text("Backup to JSON") }
          OutlinedButton(onClick = onRestore) { Text("Restore from JSON") }
        }
      }
    }
    ElevatedCard(Modifier.fillMaxWidth()) {
      Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("About", style = MaterialTheme.typography.titleMedium)
        Text("PayTracker Native v1.0")
        Text("A lightweight offline-first payment tracker.")
        Text("Developer: Francis Andei Pelayo")
      }
    }
  }
}

@Composable
fun ClientsScreen(repo: com.paytracker.nativeapp.data.Repository, onRefresh: () -> Unit, externalShowAdd: MutableState<Boolean>) {
  var clients by remember { mutableStateOf<List<com.paytracker.nativeapp.data.ClientEntity>>(emptyList()) }
  var loading by remember { mutableStateOf(true) }
  var showAdd by remember { mutableStateOf(false) }
  LaunchedEffect(externalShowAdd.value) { if (externalShowAdd.value) { showAdd = true; externalShowAdd.value = false } }
  val scope = rememberCoroutineScope()

  LaunchedEffect(Unit) {
    scope.launch { clients = repo.listClients(); loading = false }
  }

  Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
    Text("Clients", style = MaterialTheme.typography.titleLarge)
    if (loading) {
      Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
    } else {
      LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        items(clients, key = { it.id }) { c ->
          ElevatedCard(Modifier.fillMaxWidth()) {
            Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
              Column(Modifier.weight(1f)) {
                Text(c.name, style = MaterialTheme.typography.titleMedium)
                Text(c.email, style = MaterialTheme.typography.bodySmall, color = Color.Gray)
              }
              IconButton(onClick = {
                scope.launch {
                  val ok = repo.deleteClient(c.id)
                  if (ok) { clients = repo.listClients(); onRefresh() }
                }
              }) { Icon(Icons.Default.Delete, contentDescription = "Delete") }
            }
          }
        }
      }
    }
  }

  if (showAdd) {
    AddClientDialog(onDismiss = { showAdd = false }, onSave = { name, email, company, phone, addr ->
      scope.launch {
        repo.addClient(name, email, company, phone, addr)
        clients = repo.listClients(); onRefresh(); showAdd = false
      }
    })
  }
}

@Composable
fun AddClientDialog(onDismiss: () -> Unit, onSave: (String, String, String?, String?, String?) -> Unit) {
  var name by remember { mutableStateOf("") }
  var email by remember { mutableStateOf("") }
  var company by remember { mutableStateOf("") }
  var phone by remember { mutableStateOf("") }
  var address by remember { mutableStateOf("") }

  AlertDialog(
    onDismissRequest = onDismiss,
    title = { Text("Add Client") },
    text = {
      Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Name") })
        OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email") })
        OutlinedTextField(value = company, onValueChange = { company = it }, label = { Text("Company") })
        OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("Phone") })
        OutlinedTextField(value = address, onValueChange = { address = it }, label = { Text("Address") })
      }
    },
    confirmButton = { TextButton(onClick = { onSave(name, email, company.ifBlank { null }, phone.ifBlank { null }, address.ifBlank { null }) }) { Text("Save") } },
    dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
  )
}