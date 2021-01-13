#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include "BLE2902.h"
#include "BLEHIDDevice.h"
#include "HIDTypes.h"
#include "math.h"

#define DPAD_CENTERED   0
#define DPAD_UP         1
#define DPAD_UP_RIGHT   2
#define DPAD_RIGHT      3
#define DPAD_DOWN_RIGHT 4
#define DPAD_DOWN       5
#define DPAD_DOWN_LEFT  6
#define DPAD_LEFT       7
#define DPAD_UP_LEFT    8

class Button {
  public:
    int pin;
    int previousState;
    int currentState;

    Button(int pin) {
      this->pin = pin;
      this->previousState = 0;
      this->currentState = 0;
    }

    void read() {
      int averageRead = ((touchRead(pin) + touchRead(pin) + touchRead(pin)) / 3); // using average of 3 measurments of touchRead to eliminate false positives
      this->previousState = this->currentState;
      this->currentState = averageRead < 30;
    }
};

static BLEHIDDevice* hid;
BLECharacteristic* input;
bool connected;

class BLECallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      connected = true;
      BLE2902* desc = (BLE2902*)input->getDescriptorByUUID(BLEUUID((uint16_t)0x2902));
      desc->setNotifications(true);
    }

    void onDisconnect(BLEServer* pServer) {
      connected = false;
      BLE2902* desc = (BLE2902*)input->getDescriptorByUUID(BLEUUID((uint16_t)0x2902));
      desc->setNotifications(false);
    }
};

void taskBLE(void*) {
  BLEDevice::init("Custom Controller");
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new BLECallbacks());

  hid = new BLEHIDDevice(pServer);
  input = hid->inputReport(1);
  hid->manufacturer()->setValue("JP");

  // hid->pnp(0x02, 0xe502, 0xa111, 0x0210);
  hid->pnp(0x01, 0x02e5, 0xabbb, 0x0110);
  //  hid->pnp(0x01, 0x02e5, 0xabcd, 0x0110);
  hid->hidInfo(0x00, 0x01);

  BLESecurity *pSecurity = new BLESecurity();
  //pSecurity->setKeySize();
  pSecurity->setAuthenticationMode(ESP_LE_AUTH_BOND);

  const uint8_t reportMap[] = {
    USAGE_PAGE(1), 0x01,            // USAGE_PAGE (Generic Desktop)
    USAGE(1), 0x05,                 // USAGE (Game Pad)
    COLLECTION(1), 0x01,            // COLLECTION (Application)
    USAGE(1),            0x01, //   USAGE (Pointer)
    COLLECTION(1),       0x00,      // COLLECTION (Physical)

    // Buttons
    REPORT_ID(1),       0x01,       // Report ID (1)
    USAGE_PAGE(1),      0x09,       // Buttons...
    USAGE_MINIMUM(1),   0x01,       // Minimum - button 1
    USAGE_MAXIMUM(1),   0x04,       // Maximum - button 8
    LOGICAL_MINIMUM(1), 0x00,       // Logical minimum 0 (not pressed)
    LOGICAL_MAXIMUM(1), 0x01,       // Logical maximum 1 (pressed)
    REPORT_SIZE(1),     0x01,       // 1 bit per button
    REPORT_COUNT(1),    0x04,       // 8 buttons
    HIDINPUT(1),        0x02,       // Data,Var,Abs,No Wrap,Linear,Preferred State,No Null Position
    // Padding so that we have 8 bits
    0x95, 0x01,          //     REPORT_COUNT = 1
    0x75, 0x04,          //     REPORT_SIZE = 5
    0x81, 0x03,          //     INPUT = Cnst,Var,Abs

    // Hat switch
    0x05, 0x01,     //   USAGE_PAGE (Generic Desktop)
    0x09, 0x39,     //   USAGE (Hat switch)
    0x15, 0x01,     //   LOGICAL_MINIMUM (1)
    0x25, 0x08,     //   LOGICAL_MAXIMUM (8)
    0x35, 0x00,     //   PHYSICAL_MINIMUM (0)
    0x46, 0x3B, 0x01, //   PHYSICAL_MAXIMUM (315)
    0x65, 0x14,     //   UNIT (Eng Rot:Angular Pos)
    0x75, 0x04,     //   REPORT_SIZE (4)
    0x95, 0x01,     //   REPORT_COUNT (1)
    0x81, 0x02,     //   INPUT (Data,Var,Abs)
    // Padding so that we have 8 bits
    0x95, 0x01,          //     REPORT_COUNT = 1
    0x75, 0x04,          //     REPORT_SIZE = 5
    0x81, 0x03,          //     INPUT = Cnst,Var,Abs

    //controll sticks // there is no control stick but we need this for steam to accept us as a controller
    0x75, 0x08,                   //      REPORT_SIZE (8)
    0x95, 0x03,                   //      REPORT_COUNT (3)
    0x05, 0x01,                   //      USAGE_PAGE (Generic Desktop)
    0x09, 0x30,                   //      USAGE (X)
    0x09, 0x31,                   //      USAGE (Y)
    0x09, 0x33,                   //      USAGE (Rx)
    0x15, 0x81,                   //      LOGICAL_MINIMUM (-127)
    0x25, 0x7f,                   //      LOGICAL_MAXIMUM (127)
    0x81, 0x02,                   //      INPUT (Data, Var, Abs)

    END_COLLECTION(0),              // END_COLLECTION
    END_COLLECTION(0)               // END_COLLECTION
  };

  hid->reportMap((uint8_t*)reportMap, sizeof(reportMap));
  hid->startServices();

  BLEAdvertising *pAdvertising = pServer->getAdvertising();
  pAdvertising->setAppearance(HID_GAMEPAD);
  pAdvertising->addServiceUUID(hid->hidService()->getUUID());
  pAdvertising->start();

  hid->setBatteryLevel(100);
  delay(portMAX_DELAY);
}

// setup Buttons
Button btn0(4);
Button btn1(2);
Button btn2(15);
Button btn3(13);
Button dpadUp(32);
Button dpadRight(33);
Button dpadDown(14);
Button dpadLeft(12);

Button* allButtons[] = { &btn0, &btn1, &btn2, &btn3, &dpadUp, &dpadRight, &dpadDown, &dpadLeft};
Button* actionButtons[] = { &btn0, &btn1, &btn2, &btn3};

void setup() {
  Serial.begin(115200);
  // init BLE
  xTaskCreate(taskBLE, "server", 20000, NULL, 5, NULL);
}

void loop() {
  bool stateChange;
  for (Button* button : allButtons) {
    button->read();
    if (button->currentState != button->previousState) {
      stateChange = true;
    }
  }

  // Send BLE update.
  if (connected && stateChange) {
    uint8_t buttonStates = 0;
    uint8_t dpadState = DPAD_CENTERED;

    int i = 0;
    for (Button* button : actionButtons) {
      buttonStates |= button->currentState << i;
      i++;
    }

    if (dpadUp.currentState || dpadRight.currentState || dpadDown.currentState || dpadLeft.currentState) {
      if (dpadUp.currentState) {
        if (dpadRight.currentState) {
          dpadState = DPAD_UP_RIGHT;
        } else if (dpadLeft.currentState) {
          dpadState = DPAD_UP_LEFT;
        } else
          dpadState = DPAD_UP;
      } else if (dpadDown.currentState) {
        if (dpadRight.currentState) {
          dpadState = DPAD_DOWN_RIGHT;
        } else if (dpadLeft.currentState) {
          dpadState = DPAD_DOWN_LEFT;
        } else
          dpadState = DPAD_DOWN;
      } else if (dpadRight.currentState) {
        dpadState = DPAD_RIGHT;
      } else if (dpadLeft.currentState) {
        dpadState = DPAD_LEFT;
      }
    } else {
      dpadState = DPAD_CENTERED;
    }

    uint8_t controllerState[] = {buttonStates, dpadState, 0, 0, 0};
    input->setValue(controllerState, sizeof(controllerState));
    input->notify();
  }
  delay(5);
}
