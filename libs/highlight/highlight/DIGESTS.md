## Subresource Integrity

If you are loading Highlight.js via CDN you may wish to use [Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) to guarantee that you are using a legimitate build of the library.

To do this you simply need to add the `integrity` attribute for each JavaScript file you download via CDN. These digests are used by the browser to confirm the files downloaded have not been modified.

```html
<script
  src="//cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"
  integrity="sha384-xBsHBR6BS/LSlO3cOyY2D/4KkmaHjlNn3NnXUMFFc14HLZD7vwVgS3+6U/WkHAra"></script>
<!-- including any other grammars you might need to load -->
<script
  src="//cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/go.min.js"
  integrity="sha384-WmGkHEmwSI19EhTfO1nrSk3RziUQKRWg3vO0Ur3VYZjWvJRdRnX4/scQg+S2w1fI"></script>
```

The full list of digests for every file can be found below.

### Digests

```
sha384-aE6FFuNOdWKOdWyCTVnCnZH4NBESWCBoti6+Jn5mq+Ss7DMPzJKHz7W3VkYTFhWz /es/languages/mathematica.js
sha384-ZOli511kLeGbbzCcuVX7mH7u8A+Vv5xoT3HaBPcSW8DwrsJkjCA7Ln+Wluj9Xm17 /es/languages/mathematica.min.js
sha384-pwYx5UHO9OuH2fKa087IpKIBIlWTlzTGYo/nUJ9C2vGcOy19NI3zxCU/LV4QzL+N /languages/mathematica.js
sha384-Y0PVkUaoJo8lSq1gzhxTxCx58Dd5w7lB/0RKYuIK7hmiVyndY9vplBBava32RP+m /languages/mathematica.min.js
sha384-ZIKLxUUNGzDCEcH+qjLGSHeNvPlMYXet14RzwYj1zBPDHKlWivJZfYPNg1SBj2Ni /highlight.js
sha384-iFXYCFJt4gCyz6J6DYUGyujXE9BuPuI/AfyXELCiDMXcwj/okR7pTZIhaoxEWUnF /highlight.min.js
```

