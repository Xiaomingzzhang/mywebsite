<!--
Add here global page variables to use throughout your website.
-->
@def website_title = "晓明的主页"
@def website_descr = "Example website using Franklin"
@def website_url   = "https://tlienart.github.io/FranklinTemplates.jl/"

@def author = "xiaoming"

@def prepath = "mywebsite"

@def mintoclevel = 2

<!--
Add here files or directories that should be ignored by Franklin, otherwise
these files might be copied and, if markdown, processed by Franklin which
you might not want. Indicate directories by ending the name with a `/`.
-->


<!--
Add here global latex commands to use throughout your pages.
-->
\newcommand{\R}{\mathbb R}
\newcommand{\scal}[1]{\langle #1 \rangle}

\newcommand{\df}[2]{
  @@df
  **定义 #1 :** #2
  @@
}

\newcommand{\thm}[2]{
  @@df
  **定理 #1 :** #2
  @@
}

\newcommand{\cor}[2]{
  @@df
  **推论 #1 :** #2
  @@
}

\newcommand{\lm}[2]{
  @@df
  **引理 #1 :** #2
  @@
}

\newcommand{\prop}[2]{
  @@df
  **命题 #1 :** #2
  @@
}

\newcommand{\rmk}[2]{
  @@warn
  **注 #1 :** #2
  @@
}

\newcommand{\proof}[1]{
  @@proof
  **证明 :** #1
  @@
}