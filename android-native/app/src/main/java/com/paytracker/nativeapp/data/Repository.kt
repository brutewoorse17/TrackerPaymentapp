package com.paytracker.nativeapp.data

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.*

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

  companion object {
    fun create(context: Context) = Repository(AppDatabase.get(context))
  }
}