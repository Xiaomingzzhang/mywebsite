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
sha384-0OZaeLK1yb5eP3nW4y0JP1fVharSrsuv/1mkI/6/8aRFm9laYIWIMXjCOqu+vRW5 /es/languages/c.js
sha384-G7WtwjMBNGrPly3ZsbPhfnT0v88hG3Ea9fQhrSWfzj7cNAsXsU7EKMQLyLGj7vTH /es/languages/c.min.js
sha384-Wjwd1YEG/PYlkLHTWIx+RlPK6XboMN3bEpveERJ8D8Z4RaNE02Ho19ZFrSRPGi0j /es/languages/cpp.js
sha384-Q4zTNH8WsDVdSZbiZtzWS1HmAUcvMSdTmth9Uqgfjmx7Qzw6B8E3lC9ieUbE/9u4 /es/languages/cpp.min.js
sha384-T5TWWx2SVBqE/AJVqpKp6D8+8rpEcX+Usy65BcRR6SM8QEh62nMtxDsowBlhx1Ay /es/languages/julia.js
sha384-NqyA97ZywXJCu5WG4NiDyJRAYm5L2aGPPTeGnRSfkEtK8Lch/likdativWWAbLUs /es/languages/julia.min.js
sha384-j88HjPMV74WRxV1AxVCYrU0qm75a94ZrGEDzTEGiq+qKh/DF44dInmW4+8lUbHdl /es/languages/julia-repl.js
sha384-LTa0cywuUcomDh5o0gVu3KGAtps34A+P7poAvNGIuu1GCw79Q6rFXzyHtbFKK6hl /es/languages/julia-repl.min.js
sha384-aE6FFuNOdWKOdWyCTVnCnZH4NBESWCBoti6+Jn5mq+Ss7DMPzJKHz7W3VkYTFhWz /es/languages/mathematica.js
sha384-ZOli511kLeGbbzCcuVX7mH7u8A+Vv5xoT3HaBPcSW8DwrsJkjCA7Ln+Wluj9Xm17 /es/languages/mathematica.min.js
sha384-KW5m+lJxeSte36eSdXdF6RWKt1rP3PKVAblsiDORE441O/7ONXso3W4FMiQM7DVo /es/languages/matlab.js
sha384-gU9Mv6FEG6RVi/d3cgP9RYHSdGMkLi/gYQCn7smdbY+m1qDCN2paZoONWRk0tBP4 /es/languages/matlab.min.js
sha384-VZxKf0mjKYDwZIgrW+InqDfJ0YwYUFEMw/4YmpV1oKtVXFVmVq/Ga1vgq6zKTUqS /languages/c.js
sha384-mWenE7UXKnmYRcJ3mh+Os3iZ43BmFf9x3AZMM6gi/2sT6vxouPWspbTdREwWDO3w /languages/c.min.js
sha384-J4Ge+xXjXgzbK2FP+OyzIGHLfKU/RR0+cH4JJCaczeLETtVIvJdvqfikWlDuQ66e /languages/cpp.js
sha384-LMyrRAiUz6we2SGvYrwDd4TJoJZ+m/5c+4n4E64KVkfWFcZdlrs4Wabr0crMesyy /languages/cpp.min.js
sha384-ejh0O6l/Lf9xflCigwVR6FqqJAWhVWB+M7kjlcNSQvtso+e2QBqicY9b56ih9a2X /languages/julia.js
sha384-ZqjopgKriSJBeG1uYhjsw3GyqKRlsBIGaR55EzUgK9wOsFdbB67p+I0Lu9qqDf2j /languages/julia.min.js
sha384-22/zFztcXrE/pLQhJdLUc/pe7c6+emaNtCEgS3DHIA5djtUl0E7O+TYg+kuDG5Ss /languages/julia-repl.js
sha384-fyOrUSw80R//DSvkLRfpGAxhjx6MpL1QoWcTCG9hXXT74sh7gXeUrstn7IwT0G3K /languages/julia-repl.min.js
sha384-pwYx5UHO9OuH2fKa087IpKIBIlWTlzTGYo/nUJ9C2vGcOy19NI3zxCU/LV4QzL+N /languages/mathematica.js
sha384-Y0PVkUaoJo8lSq1gzhxTxCx58Dd5w7lB/0RKYuIK7hmiVyndY9vplBBava32RP+m /languages/mathematica.min.js
sha384-NKxL9la40gyvGCP5oLrJcIJDWXXv2FJc9aatPho9P/PAH1IcOBIcklePMhGDlI6x /languages/matlab.js
sha384-KveG8st4Ls4iaD1XzpsBzVc7g2K6kxnbxlZOy9cH6Knla0ZH9jsloP8nOOs6WYMP /languages/matlab.min.js
sha384-qb9EMo5DvZj5Jy1wsOCepwlcKxch9/fAKYvMRDK0Owz9lqq9CHuwVuFnuqSqBWCt /highlight.js
sha384-v7DZ/oWmWqUKwkHXeg3kHwNa3yoTmle7LR1c6sJXUhAY1oG8iUzb8J9g590Aqs03 /highlight.min.js
```

