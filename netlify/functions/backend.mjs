import {proxyHostingRequest} from '../../server/hosting-proxy.mjs';
export default request=>proxyHostingRequest(request,process.env);
export const config={path:['/api/*','/recruitment/*']};
