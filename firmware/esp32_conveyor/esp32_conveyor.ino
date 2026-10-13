// ==============================================================================
// FIRMWARE ESP32 CONVEYOR TELUR FIAN'S FARM
// Modul: Sensor IR (FC-51) + LCD I2C 16x2 + Driver Motor (L298N) + WiFi & MQTT
// Untuk Tugas Manajemen Inovasi & Implementasi Mitra Pasuruan
// ==============================================================================

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ======================== KONFIGURASI PIN =====================================
const int IR_PIN        = 4;   // Sensor IR FC-51 (Output ke GPIO 4)
const int SDA_PIN       = 21;  // LCD I2C SDA
const int SCL_PIN       = 22;  // LCD I2C SCL

// Pin Driver Motor (L298N)
const int MOTOR_IN1     = 18;  // Arah putar 1
const int MOTOR_IN2     = 19;  // Arah putar 2
const int MOTOR_ENA     = 5;   // PWM Kecepatan (Enable A)

// ======================== KONFIGURASI WIFI & MQTT =============================
const char* WIFI_SSID     = "NAMA_HOTSPOT_LAPTOP";    // Ganti dengan Nama Hotspot Laptop Anda
const char* WIFI_PASSWORD = "PASSWORD_HOTSPOT";       // Ganti dengan Password Hotspot Laptop
const char* MQTT_BROKER   = "192.168.137.1";          // IP Default Hotspot Laptop (100% Offline Tanpa Kuota Internet)
const int   MQTT_PORT     = 1883;
const char* MQTT_CLIENT_ID= "ESP32_Conveyor_FiansFarm";

// Topik MQTT
const char* TOPIC_COUNT   = "fiansfarm/conveyor/count";  // ESP32 mengirim hitungan ke Node-RED
const char* TOPIC_CONTROL = "fiansfarm/conveyor/motor";  // Node-RED mengirim START/STOP ke ESP32

// ======================== KONFIGURASI PWM MOTOR ===============================
const int PWM_FREQ        = 1000;  // 1 kHz
const int PWM_RESOLUTION  = 8;     // 8-bit (0 - 255)
int motorSpeed            = 180;   // Kecepatan default (0 = Berhenti, 255 = Maksimal)
bool motorRunning         = true;  // Status motor awal jalan

// ======================== VARIABEL SISTEM =====================================
const unsigned long DEBOUNCE_MS = 40; // Filter getaran sensor IR saat telur lewat
LiquidCrystal_I2C *lcd = nullptr;

WiFiClient espClient;
PubSubClient mqttClient(espClient);

bool lastReading = false;
bool stableState = false;
unsigned long lastChangeTime = 0;
unsigned long eggCount = 0;

unsigned long lastMqttRetry = 0;
unsigned long lastHeartbeat = 0;

// ======================== FUNGSI DRIVER MOTOR =================================
void startMotor(int speed) {
  digitalWrite(MOTOR_IN1, HIGH);
  digitalWrite(MOTOR_IN2, LOW);
  ledcWrite(MOTOR_ENA, constrain(speed, 0, 255));
  motorRunning = true;
  Serial.printf("[MOTOR] Berjalan dengan kecepatan: %d\n", speed);
}

void stopMotor() {
  digitalWrite(MOTOR_IN1, LOW);
  digitalWrite(MOTOR_IN2, LOW);
  ledcWrite(MOTOR_ENA, 0);
  motorRunning = false;
  Serial.println("[MOTOR] Berhenti");
}

// ======================== FUNGSI I2C SCANNER ==================================
uint8_t scanI2C() {
  uint8_t lcdAddr = 0;
  int found = 0;
  Serial.println("Memindai bus I2C...");
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.printf("  -> Perangkat terdeteksi di 0x%02X\n", addr);
      found++;
      if (lcdAddr == 0 && ((addr >= 0x20 && addr <= 0x27) || (addr >= 0x38 && addr <= 0x3F))) {
        lcdAddr = addr;
      }
    }
  }
  return lcdAddr;
}

// ======================== TAMPILAN LCD ========================================
void tampilkanLCD() {
  if (!lcd) return;
  
  // Baris 1: Status Motor & Status Koneksi WiFi
  lcd->setCursor(0, 0);
  if (motorRunning) {
    lcd->print("MOTOR:ON ");
  } else {
    lcd->print("MOTOR:OFF");
  }

  if (mqttClient.connected()) {
    lcd->print(" [MQTT]");
  } else if (WiFi.status() == WL_CONNECTED) {
    lcd->print(" [WiFi]");
  } else {
    lcd->print(" [OFFL]");
  }

  // Baris 2: Total Telur Terhitung
  lcd->setCursor(0, 1);
  lcd->printf("Telur: %-4lu btr", eggCount);
}

// ======================== MQTT CALLBACK (Menerima Perintah dari Node-RED) =====
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  message.trim();
  Serial.printf("[MQTT RECV] Topik: %s | Pesan: %s\n", topic, message.c_str());

  if (String(topic) == TOPIC_CONTROL) {
    if (message.equalsIgnoreCase("START")) {
      startMotor(motorSpeed);
    } else if (message.equalsIgnoreCase("STOP") || message.equalsIgnoreCase("PAUSE")) {
      stopMotor();
    } else if (message.equalsIgnoreCase("RESET")) {
      eggCount = 0;
      Serial.println("[COUNT] Hitungan di-reset ke 0");
    } else if (message.toInt() > 0 && message.toInt() <= 255) {
      motorSpeed = message.toInt();
      if (motorRunning) startMotor(motorSpeed);
    }
    tampilkanLCD();
  }
}

// ======================== KONEKSI WIFI & MQTT (ROBUST LOGGING) =================
void hubungkanWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.printf("\n[WIFI] Menghubungkan ke: %s ", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempt = 0;
  while (WiFi.status() != WL_CONNECTED && attempt < 15) {
    delay(500);
    Serial.print(".");
    attempt++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] BERHASIL TERHUBUNG!");
    Serial.printf("[WIFI] IP ESP32: %s | Gateway: %s\n", 
                  WiFi.localIP().toString().c_str(), 
                  WiFi.gatewayIP().toString().c_str());
  } else {
    Serial.println("\n[WIFI] Menunggu koneksi di latar belakang... (Pastikan Hotspot Band 2.4 GHz)");
  }
}

void hubungkanMQTT() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (mqttClient.connected()) return;

  // Coba sambung setiap 3 detik sekali
  if (millis() - lastMqttRetry > 3000) {
    lastMqttRetry = millis();
    Serial.printf("[MQTT] Menghubungkan ke %s:%d ... ", MQTT_BROKER, MQTT_PORT);
    // Sambung dengan LWT (Last Will & Testament): jika ESP32 dicabut/mati, broker langsung mengirim alive: false
    if (mqttClient.connect(MQTT_CLIENT_ID, "fiansfarm/conveyor/heartbeat", 0, true, "{\"alive\":false}")) {
      Serial.println("BERHASIL!");
      mqttClient.subscribe(TOPIC_CONTROL);
      tampilkanLCD();
    } else {
      Serial.printf("GAGAL (rc=%d)\n", mqttClient.state());
    }
  }
}

// ======================== SETUP ===============================================
void setup() {
  Serial.begin(115200);
  delay(300);

  // Inisialisasi Pin IR Sensor
  pinMode(IR_PIN, INPUT_PULLUP);

  // Inisialisasi Pin Motor
  pinMode(MOTOR_IN1, OUTPUT);
  pinMode(MOTOR_IN2, OUTPUT);
  pinMode(MOTOR_ENA, OUTPUT);

  // Konfigurasi PWM ESP32 Core 3.x (ledcAttach)
  ledcAttach(MOTOR_ENA, PWM_FREQ, PWM_RESOLUTION);

  // Matikan motor dulu saat awal menyala
  stopMotor();

  // Inisialisasi I2C & LCD
  Wire.begin(SDA_PIN, SCL_PIN);
  uint8_t addr = scanI2C();
  if (addr != 0) {
    Serial.printf("LCD terdeteksi di alamat 0x%02X\n", addr);
    lcd = new LiquidCrystal_I2C(addr, 16, 2);
    lcd->init();
    lcd->backlight();
    lcd->setCursor(0, 0);
    lcd->print("Fian's Farm IoT");
    lcd->setCursor(0, 1);
    lcd->print("Conveyor Telur");
    delay(1200);
    lcd->clear();
  } else {
    Serial.println("PERINGATAN: LCD tidak ditemukan. Cek jalur I2C.");
  }

  // Setup WiFi & MQTT
  hubungkanWiFi();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);

  // Jalankan motor conveyor perlahan
  startMotor(motorSpeed);
  tampilkanLCD();
  Serial.println("[SISTEM] Conveyor Siap Digunakan!");
}

// ======================== LOOP UTAMA ==========================================
void loop() {
  // 1. Tangani Komunikasi MQTT & WiFi secara non-blocking
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) {
      hubungkanMQTT();
    } else {
      mqttClient.loop();
    }
  }

  // 2. Pembacaan Sensor IR dengan Filter Debounce
  // Sensor FC-51 mengeluarkan LOW saat ada telur memantulkan sinar infra merah
  bool reading = (digitalRead(IR_PIN) == LOW);

  if (reading != lastReading) {
    lastChangeTime = millis();
    lastReading = reading;
  }

  // Jika kondisi stabil melebihi durasi debounce
  if ((millis() - lastChangeTime) > DEBOUNCE_MS && reading != stableState) {
    stableState = reading;
    
    // Saat telur baru saja lewat dan terdeteksi
    if (stableState) {
      eggCount++;
      Serial.printf("-> Telur terdeteksi! Total: %lu butir\n", eggCount);
      
      // Update tampilan LCD lokal
      tampilkanLCD();

      // Kirim data ke Node-RED via MQTT (Payload JSON)
      if (mqttClient.connected()) {
        char payload[64];
        snprintf(payload, sizeof(payload), "{\"count\":%lu,\"delta\":1}", eggCount);
        mqttClient.publish(TOPIC_COUNT, payload);
        Serial.printf("[MQTT PUB] Mengirim: %s ke topik %s\n", payload, TOPIC_COUNT);
      }
    }
  }

  // 3. Heartbeat berkala ke Node-RED setiap 3 detik (Status Liveness Perangkat Nyata)
  if (millis() - lastHeartbeat > 3000) {
    lastHeartbeat = millis();
    if (mqttClient.connected()) {
      char hbPayload[80];
      snprintf(hbPayload, sizeof(hbPayload), "{\"alive\":true,\"count\":%lu,\"motor\":%s}", 
               eggCount, motorRunning ? "true" : "false");
      mqttClient.publish("fiansfarm/conveyor/heartbeat", hbPayload);
    }
  }
}
