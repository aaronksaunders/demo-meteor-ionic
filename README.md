# demo-meteor-ionic 

Project to familiarize myself with integrating Ionic Framework with Meteor; this code runs in emulator and on device.
I also just added a plugin to make sure the extra stuff works fine.

## Transport Error Fix Needed for IOS

required info-plist change

```XML
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>
</dict>
```

## When Running on Devices Configure Database

configure the ip address of server in `www/lib/meteor-client-side/meteor-runtime-config.js` local host wont work when running omn device

```Javascript
__meteor_runtime_config__ = {};
__meteor_runtime_config__.DDP_DEFAULT_CONNECTION_URL = 'http://192.168.1.5:3000';
```

