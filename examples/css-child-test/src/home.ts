import { router } from 'pelelajs'

export class Home {
  title = 'Home - Child CSS Test'

  goToDetail() {
    router.navigateTo('/detail')
  }
}
