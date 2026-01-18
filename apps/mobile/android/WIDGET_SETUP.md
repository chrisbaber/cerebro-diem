# Android Widget Setup

The Cerebro Diem Quick Capture widget allows users to capture thoughts directly from their home screen.

## Setup Instructions

After generating the full Android project (via `npx react-native run-android`), you need to:

### 1. Add widget receiver to AndroidManifest.xml

Add inside the `<application>` tag:

```xml
<receiver
    android:name=".widget.CaptureWidgetProvider"
    android:exported="true">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/widget_capture_info" />
</receiver>
```

### 2. Add string resource

In `res/values/strings.xml`:

```xml
<string name="widget_description">Quick capture thoughts with voice or text</string>
```

### 3. Handle deep link intents in MainActivity

The widget sends intents with these actions:
- `com.cerebrodiem.ACTION_VOICE_CAPTURE` - Open voice capture
- `com.cerebrodiem.ACTION_TEXT_CAPTURE` - Open text capture

Handle these in your React Native code via Linking API.

## Widget Features

- **Voice Button**: Opens app directly to voice capture mode
- **Text Button**: Opens app directly to text input
- **Tap Background**: Opens app normally

## Customization

Edit the following files to customize the widget:
- `res/layout/widget_capture.xml` - Widget layout
- `res/drawable/widget_background.xml` - Background style
- `res/drawable/widget_button_*.xml` - Button styles
