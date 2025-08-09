package com.paytracker.nativeapp.data

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.*
import com.google.gson.Gson

class Repository(private val db: AppDatabase) {
  suspend fun ensureSeed() = withContext(Dispatchers.IO) {
    if (db.clientDao().list().isEmpty()) {
      val client = ClientEntity(name = "Juan Dela Cruz", email = "juan@example.com")
      db.clientDao().upsert(client)
      db.paymentDao().upsert(
        PaymentEntity(
          clientId = client.id,
          invoiceNumber = "INV-1001",
          amount = 1500.0,
          dueDate = System.currentTimeMillis() + 7 * 86_400_000L,
          status = "pending",
          description = "Website design initial fee"
        )
      )
      db.paymentDao().upsert(
        PaymentEntity(
          clientId = client.id,
          invoiceNumber = "INV-0998",
          amount = 2500.0,
          dueDate = System.currentTimeMillis() - 20 * 86_400_000L,
          paidDate = System.currentTimeMillis() - 15 * 86_400_000L,
          status = "paid",
          description = "Consulting retainer"
        )
      )
    }
  }

  suspend fun listPaymentsWithClient(): List<PaymentWithClient> = withContext(Dispatchers.IO) {
    db.paymentDao().listWithClient()
  }

  suspend fun upsertPayment(p: PaymentEntity) = withContext(Dispatchers.IO) {
    db.paymentDao().upsert(p)
  }

  suspend fun deletePayment(paymentId: String) = withContext(Dispatchers.IO) {
    db.paymentDao().deleteById(paymentId)
  }

  suspend fun exportPaymentsCsv(): String = withContext(Dispatchers.IO) {
    val rows = db.paymentDao().listWithClient()
    val headers = listOf("invoiceNumber","clientName","amount","dueDate","paidDate","status","description")
    val lines = mutableListOf(headers.joinToString(","))
    rows.forEach { r ->
      val p = r.payment
      val values = listOf(
        p.invoiceNumber,
        r.clientName,
        String.format("%.2f", p.amount),
        p.dueDate.toString(),
        (p.paidDate?.toString() ?: ""),
        p.status,
        p.description ?: ""
      ).map { it.replace("\"", "\"\"") }.map { v -> if ("," in v || "\n" in v) "\"$v\"" else v }
      lines.add(values.joinToString(","))
    }
    lines.joinToString("\n")
  }

  suspend fun listClients(): List<ClientEntity> = withContext(Dispatchers.IO) { db.clientDao().list() }

  suspend fun addClient(name: String, email: String, company: String?, phone: String?, address: String?): ClientEntity = withContext(Dispatchers.IO) {
    val c = ClientEntity(name = name, email = email, company = company, phone = phone, address = address)
    db.clientDao().upsert(c)
    c
  }

  suspend fun deleteClient(clientId: String): Boolean = withContext(Dispatchers.IO) {
    val hasPayments = db.paymentDao().countByClient(clientId) > 0
    if (hasPayments) return@withContext false
    db.clientDao().deleteById(clientId)
    true
  }

  data class Backup(val clients: List<ClientEntity>, val payments: List<PaymentEntity>)

  suspend fun exportJson(): String = withContext(Dispatchers.IO) {
    val clients = db.clientDao().list()
    val payments = db.paymentDao().list()
    Gson().toJson(Backup(clients, payments))
  }

  suspend fun importJson(json: String) = withContext(Dispatchers.IO) {
    val bk = Gson().fromJson(json, Backup::class.java)
    bk.clients.forEach { db.clientDao().upsert(it) }
    bk.payments.forEach { db.paymentDao().upsert(it) }
  }

  companion object {
    fun create(context: Context) = Repository(AppDatabase.get(context))
  }
}