import { defineConfig } from "@umijs/max";

export default defineConfig({
  extraPostCSSPlugins: [
    require("tailwindcss"),
    require("autoprefixer"),
  ],

  title: "Causality Front",
  layout: false,
  routes: [
    {
      routes: [
        {
          path: "/",
          redirect: "/home",
        },
        
        {
          path: "/vote",
          component: "@/pages/vote",
        },
        {
          path: "/alignment",
          component: "@/pages/alignment",
        },
        {
          path: "/governance/:subspaceId",
          component: "@/pages/governance",
        },
        {
          path: "/create-subspace",
          component: "@/pages/create-subspace",
        },
        {
          path: "/causalitygraph",
          component: "@/pages/causality_graph",
        },
        {
          path: "/model",
          component: "@/pages/model/welcome",
        },
        {
          path:"/model/create",
          component: "@/pages/model/create",
        },
        {
          path: "/profile",
          component: "@/pages/profile",
        },
        {
          path: "/home",
          component: "@/pages/home",
        },
        {
          path: "/model/create-project",
          component: "@/pages/model/create-project",
        },
        {
          path: "/model/project",
          component: "@/pages/model/project",
        },
        {
          path: "/model/project/:id",
          component: "@/pages/model/project",
        }
      ],
    },
  ],

  fastRefresh: true,
  chainWebpack(config) {
    config.module
      .rule("wasm")
      .test(/\.wasm$/)
      .use("file-loader")
      .loader("file-loader")
      .options({
        name: "static/wasm/[name].[hash:8].[ext]",
      });
  },
  hash: true,
  jsMinifier: 'terser',
  jsMinifierOptions: {
    ecma: 2020,
    compress: {
      drop_console: true,
    },
  },
  lessLoader: {},
});