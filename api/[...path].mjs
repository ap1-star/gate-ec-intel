import {proxyHostingRequest} from '../server/hosting-proxy.mjs';
export default {fetch:request=>proxyHostingRequest(request,process.env)};
