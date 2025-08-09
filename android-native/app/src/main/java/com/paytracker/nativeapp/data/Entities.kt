package com.paytracker.nativeapp.data

import androidx.room.*
import java.util.*

@Entity(tableName = "clients")
data class ClientEntity(
  @PrimaryKey val id: String = UUID.randomUUID().toString(),
  val name: String,
  val company: String? = null,
  val email: String,
  val phone: String? = null,
  val address: String? = null,
  val createdAt: Long = System.currentTimeMillis()
)

@Entity(
  tableName = "payments",
  foreignKeys = [ForeignKey(
    entity = ClientEntity::class,
    parentColumns = ["id"],
    childColumns = ["clientId"],
    onDelete = ForeignKey.CASCADE
  )],
  indices = [Index("clientId")]
)
data class PaymentEntity(
  @PrimaryKey val id: String = UUID.randomUUID().toString(),
  val clientId: String,
  val invoiceNumber: String,
  val amount: Double,
  val dueDate: Long,
  val paidDate: Long? = null,
  val status: String = "pending",
  val description: String? = null,
  val createdAt: Long = System.currentTimeMillis()
)

@Dao
interface ClientDao {
  @Query("SELECT * FROM clients ORDER BY createdAt DESC")
  suspend fun list(): List<ClientEntity>

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun upsert(client: ClientEntity)

  @Query("DELETE FROM clients WHERE id = :id")
  suspend fun deleteById(id: String)

  @Query("SELECT * FROM clients WHERE id = :id")
  suspend fun getById(id: String): ClientEntity?
}

@Dao
interface PaymentDao {
  @Query("SELECT * FROM payments ORDER BY createdAt DESC")
  suspend fun list(): List<PaymentEntity>

  @Query("SELECT payments.*, clients.name as clientName FROM payments JOIN clients ON clients.id = payments.clientId ORDER BY payments.createdAt DESC")
  suspend fun listWithClient(): List<PaymentWithClient>

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun upsert(payment: PaymentEntity)

  @Query("SELECT COUNT(*) FROM payments WHERE clientId = :clientId")
  suspend fun countByClient(clientId: String): Int
}

data class PaymentWithClient(
  @Embedded val payment: PaymentEntity,
  @ColumnInfo(name = "clientName") val clientName: String
)