#include <Wire.h>
#include <Adafruit_AHTX0.h>
#include <BH1750.h>
#include <SPI.h>
#include <RF24.h>

// I2C sensors
Adafruit_AHTX0 aht;
BH1750 lightMeter;

// Analog pins
#define SOIL_PIN A0
#define NPK_PIN  A1
#define UV_PIN   A2

// Define pins for Relay and RGB LED
#define RELAY_PIN 4
#define RGB_R_PIN 9
#define RGB_G_PIN 6
#define RGB_B_PIN 5

// Soil moisture calibration
const int dryValue = 850;
const int wetValue = 350;

// NRF24 pins
#define RF_CE   7
#define RF_CSN  8
RF24 radio(RF_CE, RF_CSN);
const byte pipeAddress[6] = "NODE1";

// Packet structure to send data
struct SensorPacket {
  int8_t temperature;
  uint8_t humidity;
  uint16_t light;
  uint8_t soil;
  uint8_t npk;
  uint8_t uv;
  uint8_t pump_status; // 0 = OFF, 1 = ON
};

// --- Utility functions ---
int clamp01_100(int x) {
  return (x < 0) ? 0 : ((x > 100) ? 100 : x);
}

void setRGB(int r, int g, int b) {
  analogWrite(RGB_R_PIN, r);
  analogWrite(RGB_G_PIN, g);
  analogWrite(RGB_B_PIN, b);
}

int readSoil() {
  long sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(SOIL_PIN);
    delay(5);
  }
  return sum / 10;
}

int readNPK() {
  long sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(NPK_PIN);
    delay(5);
  }
  return sum / 10;
}

int readUV() {
  long sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(UV_PIN);
    delay(5);
  }
  return sum / 10;
}

void setup() {
  Serial.begin(9600);
  Wire.begin();

  pinMode(RELAY_PIN, OUTPUT);
  pinMode(RGB_R_PIN, OUTPUT);
  pinMode(RGB_G_PIN, OUTPUT);
  pinMode(RGB_B_PIN, OUTPUT);

  digitalWrite(RELAY_PIN, LOW);
  setRGB(255, 0, 0);

  if (!aht.begin()) {
    Serial.println("⚠ AHT10 not found");
    while (1);
  }
  if (!lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) {
    Serial.println("⚠ BH1750 not found");
    while (1);
  }

  radio.begin();
  radio.setPALevel(RF24_PA_LOW);
  radio.setDataRate(RF24_250KBPS);
  radio.openWritingPipe(pipeAddress);
  radio.stopListening();

  Serial.println("✅ UNO TX ready.");
}

void loop() {
  // Read sensors
  sensors_event_t humidityEvent, tempEvent;
  aht.getEvent(&humidityEvent, &tempEvent);
  float lux = lightMeter.readLightLevel();
  int soilRaw = readSoil();
  int npkRaw  = readNPK();
  int uvRaw   = readUV();

  // Build packet
  SensorPacket packet;
  packet.temperature = (int8_t)tempEvent.temperature;
  packet.humidity    = (uint8_t)clamp01_100(humidityEvent.relative_humidity);
  packet.light       = (uint16_t)lux;
  packet.soil        = (uint8_t)clamp01_100(map(soilRaw, dryValue, wetValue, 0, 100));
  packet.npk         = (uint8_t)map(npkRaw, 0, 1023, 0, 100);
  packet.uv          = (uint8_t)(uvRaw * (25.0 / 1023.0));

  // Use a dedicated variable for pump status
  uint8_t pump_status;

  if (packet.soil < 85 && packet.npk < 50) {
    pump_status = 1; // Set status to ON
    setRGB(0, 255, 0);
  } else {
    pump_status = 0; // Set status to OFF
    setRGB(255, 0, 0);
  }

  // Use the variable to control the relay and fill the data packet
  digitalWrite(RELAY_PIN, pump_status);
  packet.pump_status = pump_status;

  // Send the complete binary packet
  bool ok = radio.write(&packet, sizeof(packet));
  if (!ok) {
    Serial.println("⚠️ NRF send failed");
  }

  // Corrected: Complete debug print line
  Serial.print("TX -> ");
  Serial.print("Temp: "); Serial.print(packet.temperature); Serial.print("°C, ");
  Serial.print("Humid: "); Serial.print(packet.humidity); Serial.print("%, ");
  Serial.print("Light: "); Serial.print(packet.light); Serial.print(" lux, ");
  Serial.print("Soil: "); Serial.print(packet.soil); Serial.print("%, ");
  Serial.print("NPK: "); Serial.print(packet.npk); Serial.print("%, ");
  Serial.print("UV: "); Serial.print(packet.uv / 10.0, 1); Serial.print(", ");
  Serial.print("Pump: "); Serial.println(packet.pump_status == 1 ? "ON" : "OFF");

  delay(10000);
}
