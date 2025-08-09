package com.paytracker.nativeapp.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(entities = [ClientEntity::class, PaymentEntity::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
  abstract fun clientDao(): ClientDao
  abstract fun paymentDao(): PaymentDao

  companion object {
    @Volatile private var INSTANCE: AppDatabase? = null

    fun get(context: Context): AppDatabase = INSTANCE ?: synchronized(this) {
      val db = Room.databaseBuilder(context.applicationContext, AppDatabase::class.java, "paytracker.db")
        .fallbackToDestructiveMigration()
        .build()
      INSTANCE = db
      db
    }
  }
}