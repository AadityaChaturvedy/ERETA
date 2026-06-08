#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <RF24.h>

// NRF24 pins
#define RF_CE   4
#define RF_CSN  5
RF24 radio(RF_CE, RF_CSN);
const byte pipeAddress[6] = "NODE1";

// WiFi
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Supabase
const char* supabase_url = "https://sngznbesdrkksldtwmvw.supabase.co/rest/v1/TerraModule";
const char* supabase_api_key = "YOUR_SUPABASE_KEY"; // replace with your key

#define LED_BUILTIN 2

// --- MODIFIED: Packet structure now includes pump_status ---
struct SensorPacket {
  int8_t temperature;
  uint8_t humidity;
  uint16_t light;
  uint8_t soil;
  uint8_t npk;
  uint8_t uv;
  uint8_t pump_status; // 0 = OFF, 1 = ON
};

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  connectWiFi();

  if (!radio.begin()) { Serial.println("⚠ NRF24 not found!"); while (1); }
  radio.setPALevel(RF24_PA_LOW);
  radio.setDataRate(RF24_250KBPS);
  radio.openReadingPipe(1, pipeAddress);
  radio.startListening();

  Serial.println("✅ ESP32 RX ready.");
}

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 30) { delay(500); Serial.print("."); retries++; }
  if (WiFi.status() == WL_CONNECTED) Serial.println(" ✅ Connected to WiFi");
  else Serial.println(" ⚠ WiFi connection failed");
}

void sendToSupabase(String jsonBody) {
  if (WiFi.status() != WL_CONNECTED) { connectWiFi(); if (WiFi.status() != WL_CONNECTED) return; }

  HTTPClient http;
  http.begin(supabase_url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabase_api_key);
  http.addHeader("Authorization", String("Bearer ") + supabase_api_key);

  int code = http.POST(jsonBody);
  if (code > 0) Serial.println("✅ Supabase Response: " + http.getString());
  else Serial.println("⚠ HTTP POST failed: " + String(code));
  http.end();
}

void loop() {
  if (radio.available()) {
    SensorPacket packet;
    radio.read(&packet, sizeof(packet));

    digitalWrite(LED_BUILTIN, HIGH);

    Serial.print("📥 Packet RX -> ");
    Serial.print(packet.temperature); Serial.print("°C, ");
    Serial.print(packet.soil); Serial.print("%, ");
    Serial.print("Pump: "); Serial.println(packet.pump_status == 1 ? "ON" : "OFF");

    // --- MODIFIED: Build JSON to include pump_status ---
    String json = "{";
    json += "\"node_name\":\"Node1\",";
    json += "\"temperature\":" + String((int)packet.temperature) + ",";
    json += "\"humidity\":" + String((int)packet.humidity) + ",";
    json += "\"light\":" + String((int)packet.light) + ",";
    json += "\"soil_moisture\":" + String((int)packet.soil) + ",";
    json += "\"npk\":" + String((int)packet.npk) + ",";
    json += "\"pump_status\":" + String((int)packet.pump_status) + ","; // New field
    json += "\"uv_index\":" + String(packet.uv / 10.0, 1);
    json += "}";

    Serial.print("🚀 Sending JSON -> ");
    Serial.println(json);

    sendToSupabase(json);

    delay(500);
    digitalWrite(LED_BUILTIN, LOW);
  }
}
