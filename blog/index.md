@def title = "博客"
@def tags = ["syntax", "code"]

# 我的一些博客

~~~
<style>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  grid-gap: 1rem;
}

.grid > h2, .grid > p {
  background: aliceblue;
  padding: 0.5rem 0.5rem 1rem 0.5rem;
  font-size: 0.9em;
  line-height: 1.1rem;
  border-radius: 5px;
  text-align:left;
}

.grid > p a {
  display: block;
  padding-bottom: 0.5em;
}

</style>
<div class="grid">
~~~

{{blogposts}}

~~~
</div>
~~~

# 手写稿

- [呼吸台球生成函数的计算](/files/呼吸台球生成函数的计算.pdf)
- [椭圆台球的可积性](/files/椭圆台球的可积性.pdf)
- [外台球与碰撞振子](/files/外台球与碰撞振子.pdf)
- [基解矩阵及其性质--光滑与分段光滑情形](/files/基解矩阵及其性质--光滑与分段光滑情形.pdf)
- [半椭圆在地面的滚动](/files/半椭圆在平面上的滚动.pdf)
- [半椭球在地面的滚动](/files/半椭球在地面上的滚动.pdf)
- [Euler Disk](/files/Euler%20Disk.pdf)

# $\LaTeX$ 笔记
- [刚体动力学](/files/rigid-body-dynamics1.pdf)

# 一点说明

嗨, 这是晓明的网站. 构建这个网站的目的主要是为了记录一下自己的学习进度, 同时也为了分享的方便. 这个网站是通过 Julia 的包 [Franklin](https://github.com/tlienart/Franklin.jl) 制作的, 并部署在 Github 上. 这个网站目前达到我较为满意的水平, 它可以自动将我的博客排版, 也可以使用 LaTeX 那样的公式引用等. 但还有些美中不足, 主要就是定理环境及其引用没有得到很好的解决, 对于定理环境的定义, 注等模块, 目前还需要手动编号, 也无法超链接引用. 另外一点就是如果没有梯子, 国内访问这个网站可能会比较慢, 有时候甚至无法加载, 由于网站部署在 Github 上, 这是无法避免的事情. 以后有精力我可能尝试将这个网站部署到国内的服务器上.

如果你喜欢这个网站可以直接从左上角的 Github 链接中下载全部的网页生成文件.




