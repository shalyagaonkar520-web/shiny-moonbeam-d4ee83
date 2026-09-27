package com.momsmagic.delivery

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.minto.food.R

/**
 * Order-status pushes sent by /api/notify-order.
 *
 * While the app is in the background Android shows FCM notifications by
 * itself (on the channel below), and a tap opens MainActivity with the
 * message's data as extras. This service covers the other cases: showing the
 * notification while the app is open, and keeping the saved token current.
 */
class OrderMessagingService : FirebaseMessagingService() {

    companion object {
        const val CHANNEL_ID = "order_updates"
        const val PREFS = "push"
        const val KEY_TOKEN = "fcm_token"
        const val EXTRA_URL = "url"

        fun ensureChannel(context: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
            val manager = context.getSystemService(NotificationManager::class.java)
            if (manager.getNotificationChannel(CHANNEL_ID) != null) return
            val channel = NotificationChannel(CHANNEL_ID, "Order updates", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Accepted, out for delivery and delivered alerts for your orders"
            }
            manager.createNotificationChannel(channel)
        }

        fun saveToken(context: Context, token: String) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_TOKEN, token).apply()
        }

        fun savedToken(context: Context): String? =
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_TOKEN, null)
    }

    override fun onNewToken(token: String) {
        saveToken(this, token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val title = message.notification?.title ?: message.data["title"] ?: return
        val body = message.notification?.body ?: message.data["body"] ?: ""
        val url = message.data[EXTRA_URL]

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return

        ensureChannel(this)
        val open = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            if (url != null) putExtra(EXTRA_URL, url)
        }
        val pending = PendingIntent.getActivity(
            this, url.hashCode(), open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pending)
            .build()
        // One notification per order: a new stage replaces the previous one.
        val id = (message.data["orderId"] ?: title).hashCode()
        NotificationManagerCompat.from(this).notify(id, notification)
    }
}
