require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ReactNativePasskeys'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.platforms      = {
    :ios => '15.0',
    # macOS 13.4 is the minimum where platform passkeys (ASAuthorizationPlatformPublicKeyCredentialProvider)
    # are usable, and it matches the floor used by react-native-macos 0.85. ExpoModulesCore advertises
    # :osx => '10.15', so this is the binding constraint for this pod.
    :osx => '13.4'
  }
  s.swift_version  = '5.4'
  s.source         = { git: 'https://github.com/peterferguson/react-native-passkeys' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
  
  s.source_files = "**/*.{h,m,swift}"
end
